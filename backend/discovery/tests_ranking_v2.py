from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from interactions.models import Endorsement, HelpRequest, Review
from profiles.models import Availability, ProfileSkill
from .tests_swaps import SwapFixture


class RankingSignalTests(SwapFixture):
    """Each test changes one signal between two otherwise identical Figma teachers."""

    def setUp(self):
        super().setUp()
        self.a_user, self.a = self.member("alpha", teaches=[self.figma], goals=[])
        self.b_user, self.b = self.member("bravo", teaches=[self.figma], goals=[])

    def search(self, **params):
        response = self.client.get(reverse("discovery-search"), {"q": "Figma", **params})
        self.assertEqual(response.status_code, 200)
        return {row["id"]: row for row in response.data["results"]}

    def completed(self, seeker, helper, skill, rating=None, endorse=False):
        request = HelpRequest.objects.create(seeker=seeker, helper_profile=helper, topic=f"t{HelpRequest.objects.count()}", message="m",
                                             related_skill=skill, status=HelpRequest.Status.COMPLETED, completed_at=timezone.now())
        if rating:
            Review.objects.create(reviewer=seeker, profile=helper, help_request=request, rating=rating, comment="Great", related_skill=skill)
        if endorse:
            Endorsement.objects.get_or_create(endorser=seeker, profile=helper, skill=skill, defaults={"help_request": request})
        return request

    def fans(self, count):
        start = getattr(self, "_fans", 0)
        self._fans = start + count
        return [self.member(f"fan{index}", teaches=[self.guitar], goals=[])[0] for index in range(start, start + count)]

    def test_endorsements_for_the_searched_skill_raise_rank_and_explain_why(self):
        for fan in self.fans(2):
            self.completed(fan, self.a, self.figma, endorse=True)
        rows = self.search()
        self.assertGreater(rows[self.a.pk]["match_score"], rows[self.b.pk]["match_score"])
        self.assertIn("Endorsed for Figma by 2 members.", rows[self.a.pk]["match_reasons"])

    def test_endorsements_for_other_skills_do_not_help_this_search(self):
        ProfileSkill.objects.create(profile=self.a, skill=self.guitar, confidence_level="advanced")
        for fan in self.fans(3):
            self.completed(fan, self.a, self.guitar, endorse=True)
        ProfileSkill.objects.create(profile=self.b, skill=self.guitar, confidence_level="advanced")
        rows = self.search()
        self.assertEqual(rows[self.a.pk]["match_score"], rows[self.b.pk]["match_score"])

    def test_each_reviewer_counts_once(self):
        friend = self.fans(1)[0]
        for _ in range(3):
            self.completed(friend, self.a, self.figma, rating=5)
        for fan in self.fans(3):
            self.completed(fan, self.b, self.figma, rating=5)
        rows = self.search()
        self.assertGreater(rows[self.b.pk]["match_score"], rows[self.a.pk]["match_score"])
        self.assertIn("Feedback from 1 member.", rows[self.a.pk]["match_reasons"])

    def test_highest_rated_needs_more_than_one_review(self):
        self.completed(self.fans(1)[0], self.a, self.figma, rating=5)
        for index, fan in enumerate(self.fans(6)):
            self.completed(fan, self.b, self.figma, rating=5 if index else 4)
        ordered = [row["id"] for row in self.client.get(reverse("discovery-search"), {"q": "Figma", "ordering": "highest_rated"}).data["results"]]
        self.assertLess(ordered.index(self.b.pk), ordered.index(self.a.pk))

    def test_members_who_let_requests_expire_rank_lower(self):
        askers = self.fans(4)
        for asker in askers:
            HelpRequest.objects.create(seeker=asker, helper_profile=self.a, topic="x", message="m", status=HelpRequest.Status.EXPIRED, expired_at=timezone.now())
            HelpRequest.objects.create(seeker=asker, helper_profile=self.b, topic="y", message="m", status=HelpRequest.Status.DECLINED, declined_at=timezone.now())
        rows = self.search()
        self.assertGreater(rows[self.b.pk]["match_score"], rows[self.a.pk]["match_score"])
        self.assertIn("Answered 4 of 4 recent requests.", rows[self.b.pk]["match_reasons"])
        self.assertIn("Answered 0 of 4 recent requests.", rows[self.a.pk]["match_reasons"])

    def test_old_history_does_not_count(self):
        for asker in self.fans(4):
            stale = HelpRequest.objects.create(seeker=asker, helper_profile=self.a, topic="x", message="m", status=HelpRequest.Status.EXPIRED)
            HelpRequest.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(days=400))
        rows = self.search()
        self.assertEqual(rows[self.a.pk]["match_score"], rows[self.b.pk]["match_score"])

    def test_shared_free_times_rank_higher_and_are_named(self):
        Availability.objects.create(profile=self.mine, day_of_week="tuesday", time_block="evening")
        Availability.objects.create(profile=self.a, day_of_week="tuesday", time_block="evening")
        Availability.objects.create(profile=self.b, day_of_week="monday", time_block="morning")
        rows = self.search()
        self.assertGreater(rows[self.a.pk]["match_score"], rows[self.b.pk]["match_score"])
        self.assertIn("You're both free Tuesday evening.", rows[self.a.pk]["match_reasons"])

    def test_busy_helpers_are_steered_around(self):
        for asker in self.fans(3):
            HelpRequest.objects.create(seeker=asker, helper_profile=self.a, topic="busy", message="m")
        rows = self.search()
        self.assertGreater(rows[self.b.pk]["match_score"], rows[self.a.pk]["match_score"])

    def test_self_declared_level_is_a_small_signal(self):
        ProfileSkill.objects.filter(profile=self.a).update(confidence_level="advanced")
        ProfileSkill.objects.filter(profile=self.b).update(confidence_level="beginner")
        rows = self.search()
        gap = rows[self.a.pk]["match_score"] - rows[self.b.pk]["match_score"]
        self.assertGreater(gap, 0)
        self.assertLess(gap, 4)

    def test_recommendations_skip_people_with_an_open_request(self):
        HelpRequest.objects.create(seeker=self.me, helper_profile=self.a, topic="open", message="m")
        ids = [row["id"] for row in self.client.get(reverse("discovery-recommended")).data["results"]]
        self.assertNotIn(self.a.pk, ids)
        self.assertIn(self.b.pk, ids)

    def test_equal_swap_matches_are_ordered_by_trust(self):
        _, first = self.member("swapone", teaches=[self.figma], goals=[self.python], public_goals=True)
        _, second = self.member("swaptwo", teaches=[self.figma], goals=[self.python], public_goals=True)
        for fan in self.fans(3):
            self.completed(fan, second, self.figma, rating=5)
        ids = [row["id"] for row in self.client.get(reverse("discovery-swaps")).data["results"]]
        self.assertLess(ids.index(second.pk), ids.index(first.pk))


class TypoToleranceTests(SwapFixture):
    def test_misspelled_skills_still_find_teachers_and_say_so(self):
        _, teacher = self.member("teacher", teaches=[self.figma], goals=[])
        for typo in ("figam", "Fgima"):
            data = self.client.get(reverse("discovery-search"), {"q": typo}).data
            self.assertIn(teacher.pk, [row["id"] for row in data["results"]], typo)
            self.assertEqual(data["matching"]["interpreted_as"], ["Figma"])

    def test_exact_matches_and_unrelated_words_are_not_rewritten(self):
        self.member("teacher", teaches=[self.figma], goals=[])
        self.assertEqual(self.client.get(reverse("discovery-search"), {"q": "figma"}).data["matching"]["interpreted_as"], [])
        unrelated = self.client.get(reverse("discovery-search"), {"q": "xylophone"}).data
        self.assertEqual((unrelated["results"], unrelated["matching"]["interpreted_as"]), ([], []))

    def test_words_next_to_a_named_skill_are_left_alone(self):
        self.member("teacher", teaches=[self.figma], goals=[])
        data = self.client.get(reverse("discovery-search"), {"q": "figma pythn"}).data
        self.assertEqual(data["matching"]["interpreted_as"], [])
