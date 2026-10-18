from django.urls import reverse

from common.models import Notification
from discovery.tests_swaps import SwapFixture
from interactions.models import Endorsement, HelpRequest, Review


class RequestFixture(SwapFixture):
    def setUp(self):
        super().setUp()
        self.peer_user, self.peer = self.member("peer", teaches=[self.figma], goals=[self.python], public_goals=True)

    def make(self, status="pending", kind="swap", topic="Python for Figma"):
        return HelpRequest.objects.create(
            seeker=self.me, helper_profile=self.peer, topic=topic, message="Trade?", related_skill=self.figma,
            kind=kind, offered_skill=self.python if kind == "swap" else None, status=status,
        )

    def patch(self, row, user, **data):
        self.client.force_authenticate(user)
        row.refresh_from_db()
        return self.client.patch(reverse("help-requests-detail", args=[row.pk]), {"version": row.version, **data}, format="json")

    def bucket(self, user, name):
        self.client.force_authenticate(user)
        return [row["id"] for row in self.client.get(reverse("help-requests-list"), {"bucket": name}).data["results"]]


class InboxBucketTests(RequestFixture):
    def test_buckets_follow_whose_turn_it_is(self):
        sent = self.make()
        accepted = self.make("accepted", topic="Accepted")
        completed = self.make("completed", topic="Done")
        declined = self.make("declined", topic="No")
        self.assertEqual(self.bucket(self.me, "needs_action"), [completed.pk])
        self.assertEqual(set(self.bucket(self.me, "active")), {sent.pk, accepted.pk})
        self.assertEqual(self.bucket(self.me, "past"), [declined.pk])
        self.assertEqual(set(self.bucket(self.peer_user, "needs_action")), {sent.pk, completed.pk})
        self.assertEqual(self.bucket(self.peer_user, "active"), [accepted.pk])

    def test_reviewed_requests_move_to_past(self):
        completed = self.make("completed")
        Review.objects.create(reviewer=self.me, profile=self.peer, help_request=completed, rating=5, comment="Great")
        self.assertEqual(self.bucket(self.me, "needs_action"), [])
        self.assertEqual(self.bucket(self.me, "past"), [completed.pk])
        self.assertEqual(self.bucket(self.peer_user, "needs_action"), [completed.pk])

    def test_helpers_of_plain_help_requests_owe_no_feedback(self):
        completed = self.make("completed", kind="help")
        self.assertEqual(self.bucket(self.peer_user, "needs_action"), [])
        self.assertEqual(self.bucket(self.peer_user, "past"), [completed.pk])

    def test_unknown_bucket_is_rejected(self):
        self.assertEqual(self.client.get(reverse("help-requests-list"), {"bucket": "later"}).status_code, 400)


class CancelTests(RequestFixture):
    def test_either_side_can_cancel_an_accepted_request_with_a_reason(self):
        row = self.make("accepted")
        response = self.patch(row, self.peer_user, status="cancelled", cancel_reason="Schedule changed")
        self.assertEqual(response.status_code, 200, response.data)
        row.refresh_from_db()
        self.assertEqual((row.status, row.cancel_reason), ("cancelled", "Schedule changed"))
        self.assertIsNotNone(row.cancelled_at)
        self.assertEqual(Notification.objects.get(recipient=self.me).title, "Swap cancelled")

    def test_only_the_sender_can_withdraw_a_pending_request(self):
        row = self.make()
        self.assertEqual(self.patch(row, self.peer_user, status="cancelled").status_code, 400)
        self.assertEqual(self.patch(row, self.me, status="cancelled").status_code, 200)

    def test_reason_is_only_accepted_when_cancelling(self):
        row = self.make("accepted")
        self.assertEqual(self.patch(row, self.me, status="completed", cancel_reason="x").status_code, 400)
        row.refresh_from_db()
        self.assertEqual(row.status, "accepted")


class TwoWayFeedbackTests(RequestFixture):
    def review(self, user, profile, row, **extra):
        self.client.force_authenticate(user)
        return self.client.post(reverse("profile-reviews", args=[profile.pk]), {"help_request": row.pk, "rating": 5, "comment": "Clear and patient", **extra}, format="json")

    def endorse(self, user, profile, row, skill):
        self.client.force_authenticate(user)
        return self.client.post(reverse("profile-endorsements", args=[profile.pk]), {"help_request": row.pk, "skill": skill.pk}, format="json")

    def test_both_swap_members_review_and_endorse_what_they_learned(self):
        row = self.make("completed")
        self.assertEqual(self.review(self.me, self.peer, row, related_skill=self.figma.pk).status_code, 201)
        self.assertEqual(self.review(self.peer_user, self.mine, row, related_skill=self.python.pk).status_code, 201)
        self.assertEqual(self.endorse(self.me, self.peer, row, self.figma).status_code, 201)
        self.assertEqual(self.endorse(self.peer_user, self.mine, row, self.python).status_code, 201)
        self.assertEqual(Review.objects.filter(help_request=row).count(), 2)
        self.assertEqual(Endorsement.objects.filter(help_request=row).count(), 2)
        self.client.force_authenticate(self.me)
        self.assertEqual(self.client.get(reverse("profile-reviews", args=[self.peer.pk])).data["results"][0]["reviewer_name"], "Me")

    def test_each_member_reviews_once_and_only_the_skill_they_learned(self):
        row = self.make("completed")
        self.assertEqual(self.endorse(self.peer_user, self.mine, row, self.figma).status_code, 400)
        self.assertEqual(self.review(self.me, self.peer, row).status_code, 201)
        self.assertEqual(self.review(self.me, self.peer, row).status_code, 400)
        self.assertEqual(Review.objects.count(), 1)

    def test_helper_of_a_plain_help_request_cannot_review_the_seeker(self):
        row = self.make("completed", kind="help")
        self.assertEqual(self.review(self.peer_user, self.mine, row).status_code, 400)

    def test_feedback_requires_completion(self):
        row = self.make("accepted")
        self.assertEqual(self.review(self.me, self.peer, row).status_code, 400)

    def test_detail_reports_per_viewer_feedback_flags(self):
        row = self.make("completed")
        self.client.force_authenticate(self.peer_user)
        feedback = self.client.get(reverse("help-requests-detail", args=[row.pk])).data["feedback"]
        self.assertEqual(feedback["target_profile_id"], self.mine.pk)
        self.assertEqual(feedback["skill"], {"id": self.python.pk, "name": "Python"})
        self.assertTrue(feedback["can_review"] and feedback["can_endorse"])
        self.review(self.peer_user, self.mine, row)
        self.endorse(self.peer_user, self.mine, row, self.python)
        detail = self.client.get(reverse("help-requests-detail", args=[row.pk])).data
        self.assertFalse(detail["feedback"]["can_review"] or detail["feedback"]["can_endorse"])
        self.assertEqual(detail["feedback"]["my_review"]["rating"], 5)
        self.assertEqual(detail["my_role"], "helper")
        self.assertEqual(detail["seeker_display_name"], "Me")
        self.assertIsNone(self.client.get(reverse("help-requests-list")).data["results"][0]["feedback"])


class DeepLinkTests(RequestFixture):
    def test_notifications_and_home_items_link_to_the_request(self):
        self.client.force_authenticate(self.me)
        payload = {"helper_profile": self.peer.pk, "topic": "Figma", "message": "Hi", "related_skill": self.figma.pk, "kind": "swap", "offered_skill": self.python.pk}
        request_id = self.client.post(reverse("help-requests-list"), payload, format="json").data["id"]
        self.client.force_authenticate(self.peer_user)
        self.assertEqual(self.client.get("/api/notifications/").data["results"][0]["href"], f"/requests/{request_id}")
        item = self.client.get("/api/dashboard/").data["attention_items"][0]
        self.assertEqual((item["href"], item["kind"]), (f"/requests/{request_id}", "swap"))
