from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from common.models import AnalyticsEvent
from profiles.models import ProfileSkill, StudentProfile
from taxonomy.models import SkillCategory, SkillTag
from .models import BlockedUser


class InteractionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("a@illinois.edu", "pw", is_student_verified=True)
        self.helper_user = User.objects.create_user("b@illinois.edu", "pw", is_student_verified=True)
        self.profile = StudentProfile.objects.create(
            user=self.user,
            display_name="Self Profile",
            major="CS",
            year="junior",
            headline="Help",
            bio="Bio",
        )
        self.helper_profile = StudentProfile.objects.create(
            user=self.helper_user,
            display_name="Helper Profile",
            major="CS",
            year="senior",
            headline="Help",
            bio="Bio",
        )
        category = SkillCategory.objects.create(name="Technical", slug="technical")
        self.skill = SkillTag.objects.create(category=category, name="GitHub", slug="github")
        ProfileSkill.objects.create(profile=self.helper_profile, skill=self.skill, confidence_level="advanced")
        self.client.force_authenticate(self.user)

    def test_saved_profile_cannot_save_own_profile(self):
        response = self.client.post(reverse("saved-profiles-list"), {"saved_profile": self.profile.id}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_review_cannot_review_own_profile(self):
        response = self.client.post(reverse("profile-reviews", args=[self.profile.id]), {"rating": 5, "comment": "Great"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_help_request_can_be_created(self):
        response = self.client.post(
            reverse("help-requests-list"),
            {"helper_profile": self.helper_profile.id, "topic": "Resume feedback", "message": "Can you help?", "urgency": "medium"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AnalyticsEvent.objects.filter(event_type="help_request_created").exists())

    def test_helper_accepts_and_invalid_transition_rejected(self):
        create = self.client.post(
            reverse("help-requests-list"),
            {"helper_profile": self.helper_profile.id, "topic": "GitHub", "message": "Can you help?", "urgency": "medium"},
            format="json",
        )
        request_id = create.data["id"]
        self.client.force_authenticate(self.helper_user)
        accepted = self.client.patch(reverse("help-requests-detail", args=[request_id]), {"status": "accepted", "response_message": "Sure."}, format="json")
        self.assertEqual(accepted.status_code, 200)
        self.assertIsNotNone(accepted.data["accepted_at"])
        invalid = self.client.patch(reverse("help-requests-detail", args=[request_id]), {"status": "declined"}, format="json")
        self.assertEqual(invalid.status_code, 400)

    def test_random_user_cannot_update_help_request(self):
        create = self.client.post(
            reverse("help-requests-list"),
            {"helper_profile": self.helper_profile.id, "topic": "GitHub", "message": "Can you help?", "urgency": "medium"},
            format="json",
        )
        random = User.objects.create_user("random@illinois.edu", "pw")
        self.client.force_authenticate(random)
        response = self.client.patch(reverse("help-requests-detail", args=[create.data["id"]]), {"status": "accepted"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_block_user_and_report_creation(self):
        block = self.client.post(reverse("blocked-users-list"), {"blocked_user": self.helper_user.id}, format="json")
        self.assertEqual(block.status_code, 201)
        report = self.client.post(
            reverse("reports-list"),
            {"reported_profile": self.helper_profile.id, "reason": "spam", "description": "Suspicious profile."},
            format="json",
        )
        self.assertEqual(report.status_code, 201)
        blocked_request = self.client.post(
            reverse("help-requests-list"),
            {"helper_profile": self.helper_profile.id, "topic": "GitHub", "message": "Can you help?", "urgency": "medium"},
            format="json",
        )
        self.assertEqual(blocked_request.status_code, 400)

    def test_endorsement_cannot_self_endorse(self):
        self.client.force_authenticate(self.helper_user)
        self_endorse = self.client.post(reverse("profile-endorsements", args=[self.helper_profile.id]), {"skill": self.skill.id}, format="json")
        self.assertEqual(self_endorse.status_code, 400)

    def test_endorsement_created(self):
        response = self.client.post(reverse("profile-endorsements", args=[self.helper_profile.id]), {"skill": self.skill.id, "note": "Great Git help."}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AnalyticsEvent.objects.filter(event_type="endorsement_created").exists())


class AccessPolicyRegressionTests(APITestCase):
    setUp = InteractionTests.setUp
    def create_request(self, **overrides):
        payload = {"helper_profile": self.helper_profile.id, "topic": "GitHub", "message": "Help please"}
        payload.update(overrides)
        return self.client.post(reverse("help-requests-list"), payload, format="json")

    def test_create_cannot_force_acceptance(self):
        self.assertEqual(self.create_request(status="accepted").status_code, 400)
        self.assertEqual(self.create_request(response_message="Forged response").status_code, 400)
        self.assertEqual(self.create_request().data["status"], "pending")

    def test_submitted_participants_and_content_cannot_be_reassigned(self):
        created = self.create_request()
        url = reverse("help-requests-detail", args=[created.data["id"]])
        for change in [{"helper_profile": self.profile.id}, {"topic": "Changed"}, {"seeker": self.helper_user.id}, {"message": "Changed"}]:
            self.assertEqual(self.client.patch(url, change, format="json").status_code, 400)
        self.assertEqual(self.client.patch(url, {"status": "accepted"}, format="json").status_code, 400)

    def test_contacts_require_connection_and_revoke_on_block(self):
        from profiles.models import ContactMethod
        ContactMethod.objects.create(profile=self.helper_profile, type="email", value="shared@example.org")
        url = reverse("profiles-detail", args=[self.helper_profile.id])
        self.assertEqual(self.client.get(url).data["contact_methods"], [])
        created = self.create_request()
        self.assertIsNone(created.data["seeker_email"])
        self.client.force_authenticate(self.helper_user)
        request_url = reverse("help-requests-detail", args=[created.data["id"]])
        self.assertEqual(self.client.patch(request_url, {"status": "accepted"}, format="json").status_code, 200)
        self.client.force_authenticate(self.user)
        self.assertEqual(len(self.client.get(url).data["contact_methods"]), 1)
        self.assertEqual(self.client.patch(request_url, {"status": "completed"}, format="json").status_code, 200)
        self.assertEqual(len(self.client.get(url).data["contact_methods"]), 1)
        BlockedUser.objects.create(blocker=self.helper_user, blocked_user=self.user)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get(request_url).status_code, 404)

    def test_both_block_directions_cover_direct_similar_saved_and_feedback(self):
        saved = self.client.post(reverse("saved-profiles-list"), {"saved_profile": self.helper_profile.id}, format="json")
        self.assertEqual(saved.status_code, 201)
        for blocker, blocked in [(self.user, self.helper_user), (self.helper_user, self.user)]:
            block = BlockedUser.objects.create(blocker=blocker, blocked_user=blocked)
            for name in ["profiles-detail", "profiles-similar", "profile-reviews", "profile-endorsements"]:
                self.assertEqual(self.client.get(reverse(name, args=[self.helper_profile.id])).status_code, 404)
            self.assertEqual(self.client.get(reverse("saved-profiles-list")).data["count"], 0)
            self.assertEqual(self.create_request().status_code, 400)
            block.delete()

    def test_private_and_inactive_peers_are_unavailable(self):
        for visibility, active in [("private", True), ("public", False)]:
            self.helper_profile.visibility = visibility
            self.helper_profile.save()
            self.helper_user.is_active = active
            self.helper_user.save()
            self.assertEqual(self.client.get(reverse("profiles-detail", args=[self.helper_profile.id])).status_code, 404)
            self.assertEqual(self.create_request().status_code, 400)
