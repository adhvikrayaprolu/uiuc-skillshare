from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from common.models import Notification
from interactions.models import BlockedUser, HelpRequest
from profiles.models import Availability, ProfileSkill, StudentProfile
from taxonomy.models import SkillCategory, SkillTag


class SwapFixture(APITestCase):
    def setUp(self):
        category = SkillCategory.objects.create(name="Technical", slug="technical")
        self.python = SkillTag.objects.create(category=category, name="Python", slug="python")
        self.figma = SkillTag.objects.create(category=category, name="Figma", slug="figma")
        self.guitar = SkillTag.objects.create(category=category, name="Guitar", slug="guitar")
        self.me, self.mine = self.member("me", teaches=[self.python], goals=[self.figma], public_goals=True)
        self.client.force_authenticate(self.me)

    def member(self, name, teaches, goals, public_goals=False, **profile):
        user = User.objects.create_user(f"{name}@illinois.edu", is_student_verified=True)
        fields = {"display_name": name.title(), "major": "CS", "year": "junior", "headline": f"{name} headline", "visibility": "public", "learning_goals_public": public_goals, **profile}
        record = StudentProfile.objects.create(user=user, **fields)
        for skill in teaches:
            ProfileSkill.objects.create(profile=record, skill=skill, confidence_level="advanced")
        record.learning_goals.set(goals)
        return user, record


class SwapMatchTests(SwapFixture):
    def test_only_two_way_matches_with_public_goals_are_returned(self):
        _, mutual = self.member("mutual", teaches=[self.figma], goals=[self.python], public_goals=True)
        self.member("private", teaches=[self.figma], goals=[self.python], public_goals=False)
        self.member("oneway", teaches=[self.figma], goals=[self.guitar], public_goals=True)
        data = self.client.get(reverse("discovery-swaps")).data
        self.assertEqual([row["id"] for row in data["results"]], [mutual.pk])
        swap = data["results"][0]["swap"]
        self.assertEqual(swap["they_teach_you"], [{"id": self.figma.pk, "name": "Figma"}])
        self.assertEqual(swap["you_can_teach"], [{"id": self.python.pk, "name": "Python"}])
        self.assertTrue(swap["is_mutual"])

    def test_hidden_closed_and_blocked_members_are_excluded(self):
        self.member("hidden", teaches=[self.figma], goals=[self.python], public_goals=True, visibility="private")
        self.member("closed", teaches=[self.figma], goals=[self.python], public_goals=True, open_to_connect=False)
        blocked_user, _ = self.member("blocked", teaches=[self.figma], goals=[self.python], public_goals=True)
        BlockedUser.objects.create(blocker=blocked_user, blocked_user=self.me)
        self.assertEqual(self.client.get(reverse("discovery-swaps")).data["results"], [])

    def test_explains_why_there_are_no_matches(self):
        self.mine.learning_goals.clear()
        self.assertEqual(self.client.get(reverse("discovery-swaps")).data["matching"]["reason"], "no_learning_goals")

    def test_shared_availability_ranks_first(self):
        _, plain = self.member("plain", teaches=[self.figma], goals=[self.python], public_goals=True)
        _, overlap = self.member("overlap", teaches=[self.figma], goals=[self.python], public_goals=True)
        Availability.objects.create(profile=self.mine, day_of_week="monday", time_block="evening")
        Availability.objects.create(profile=overlap, day_of_week="monday", time_block="evening")
        ids = [row["id"] for row in self.client.get(reverse("discovery-swaps")).data["results"]]
        self.assertEqual(ids, [overlap.pk, plain.pk])

    def test_profile_detail_only_shows_goals_that_were_made_public(self):
        _, private = self.member("private", teaches=[self.figma], goals=[self.python])
        detail = self.client.get(reverse("profiles-detail", args=[private.pk])).data
        self.assertEqual(detail["wants_to_learn"], [])
        self.assertEqual(detail["swap"]["they_teach_you"], [{"id": self.figma.pk, "name": "Figma"}])
        self.assertEqual(detail["swap"]["you_can_teach"], [])
        self.assertFalse(detail["swap"]["is_mutual"])
        private.learning_goals_public = True
        private.save()
        detail = self.client.get(reverse("profiles-detail", args=[private.pk])).data
        self.assertEqual(detail["wants_to_learn"], [{"id": self.python.pk, "name": "Python"}])
        self.assertTrue(detail["swap"]["is_mutual"])


class SwapRequestTests(SwapFixture):
    def setUp(self):
        super().setUp()
        _, self.peer = self.member("peer", teaches=[self.figma], goals=[self.python], public_goals=True)

    def propose(self, **overrides):
        payload = {"helper_profile": self.peer.pk, "topic": "Python for Figma", "message": "Want to trade?", "related_skill": self.figma.pk, "kind": "swap", "offered_skill": self.python.pk, **overrides}
        return self.client.post(reverse("help-requests-list"), payload, format="json")

    def test_a_swap_offers_one_of_my_skills_for_one_of_theirs(self):
        response = self.propose()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["kind"], response.data["offered_skill_name"]), ("swap", "Python"))
        self.assertEqual(HelpRequest.objects.get().offered_skill, self.python)
        self.assertEqual(Notification.objects.get(recipient=self.peer.user).title, "New swap proposal")

    def test_swap_must_offer_a_skill_i_actually_teach(self):
        self.assertIn("offered_skill", self.propose(offered_skill=self.guitar.pk).data)
        self.assertIn("offered_skill", self.propose(offered_skill=None).data)
        self.assertIn("related_skill", self.propose(related_skill=None).data)
        self.assertFalse(HelpRequest.objects.exists())

    def test_plain_help_requests_cannot_carry_an_offered_skill(self):
        response = self.propose(kind="help")
        self.assertEqual(response.status_code, 400)
        self.assertIn("offered_skill", response.data)
        self.assertEqual(self.propose(kind="help", offered_skill=None).status_code, 201)
