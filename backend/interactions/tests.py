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
