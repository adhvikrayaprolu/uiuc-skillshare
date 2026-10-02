from io import BytesIO
from tempfile import TemporaryDirectory
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from accounts.models import User
from discovery.models import ProfileSearchIndex
from interactions.models import BlockedUser, HelpRequest
from taxonomy.models import SkillCategory, SkillTag
from .models import ContactMethod, ProfileSkill, StudentProfile


class ProfileControlTests(APITestCase):
    def setUp(self):
        self.temp = self.enterContext(TemporaryDirectory())
        self.enterContext(override_settings(MEDIA_ROOT=self.temp))
        self.user = User.objects.create_user("controls@illinois.edu", is_student_verified=True)
        self.peer = User.objects.create_user("peer@illinois.edu", is_student_verified=True)
        self.profile = StudentProfile.objects.create(user=self.user, display_name="Controls", major="CS", year="junior", headline="React help", bio="I build applications", share_contacts=True)
        self.peer_profile = StudentProfile.objects.create(user=self.peer, display_name="Peer", major="CS", year="junior", headline="Research", bio="Research advice")
        category = SkillCategory.objects.create(name="Technical", slug="technical")
        self.skill = SkillTag.objects.create(name="React", slug="react", category=category)
        self.pending = SkillTag.objects.create(name="Pending", slug="pending", category=category, is_approved=False)
        self.client.force_authenticate(self.user)

    def test_useful_onboarding_learning_goals_and_rollback(self):
        payload = {"profile": {"learning_goals": [self.skill.pk], "learning_goal_notes": "Private goal", "availability_notes": "Wednesday evening"}, "skills": [{"skill": self.skill.pk, "confidence_level": "intermediate"}]}
        response = self.client.put(reverse("profile-aggregate"), payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_completed_onboarding)
        self.assertEqual(response.data["learning_goals"], [self.skill.pk])
        payload["profile"]["learning_goals"] = [self.pending.pk]
        payload["profile"]["display_name"] = "Should roll back"
        self.assertEqual(self.client.put(reverse("profile-aggregate"), payload, format="json").status_code, 400)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.display_name, "Controls")
        self.client.force_authenticate(self.peer)
        public = self.client.get(reverse("profiles-detail", args=[self.profile.pk]))
        self.assertNotIn("learning_goals", public.data)
        self.assertNotIn("learning_goal_notes", public.data)

    def test_contact_validation_links_and_document_upload_rejection(self):
        for kind, value in [("email", "bad"), ("phone", "letters"), ("github", "javascript:alert(1)"), ("website", "ftp://example.org")]:
            self.assertEqual(self.client.post(reverse("contact-methods-list"), {"type": kind, "value": value}, format="json").status_code, 400)
        response = self.client.post(reverse("credentials-list"), {"credential_type": "project", "title": "Project", "url": "ftp://example.org"}, format="json")
        self.assertEqual(response.status_code, 400)
        response = self.client.post(reverse("credentials-list"), {"credential_type": "resume", "title": "Deferred", "file": SimpleUploadedFile("resume.pdf", b"not-a-real-document")}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_avatar_normalization_and_access_policy(self):
        buffer = BytesIO()
        image = Image.new("RGB", (800, 600), "blue")
        exif = Image.Exif(); exif[315] = "Private metadata"
        image.save(buffer, format="JPEG", exif=exif)
        response = self.client.post(reverse("avatar-upload"), {"avatar": SimpleUploadedFile("untrusted.jpg", buffer.getvalue())}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        with Image.open(self.profile.profile_picture.path) as clean:
            self.assertLessEqual(max(clean.size), 512)
            self.assertEqual(len(clean.getexif()), 0)
        self.client.force_authenticate(self.peer)
        self.assertEqual(self.client.get(reverse("avatar-detail", args=[self.profile.pk])).status_code, 200)
        BlockedUser.objects.create(blocker=self.user, blocked_user=self.peer)
        self.assertEqual(self.client.get(reverse("avatar-detail", args=[self.profile.pk])).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("avatar-detail", args=[self.profile.pk])).status_code, 401)
        self.assertEqual(self.client.get("/media/" + self.profile.profile_picture.name).status_code, 404)

    def test_invalid_and_oversized_avatars_fail_without_overwriting(self):
        for content in [b"not an image", b"x" * (2 * 1024 * 1024 + 1)]:
            response = self.client.post(reverse("avatar-upload"), {"avatar": SimpleUploadedFile("image.jpg", content)}, format="multipart")
            self.assertEqual(response.status_code, 400)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.profile_picture)

    def test_contact_consent_withdrawal_and_block_cancellation(self):
        ContactMethod.objects.create(profile=self.profile, type="email", value="shared@example.org")
        connection = HelpRequest.objects.create(seeker=self.peer, helper_profile=self.profile, status="accepted", topic="React", message="Help")
        self.client.force_authenticate(self.peer)
        url = reverse("profiles-detail", args=[self.profile.pk])
        self.assertEqual(len(self.client.get(url).data["contact_methods"]), 1)
        self.profile.share_contacts = False; self.profile.save()
        self.assertEqual(self.client.get(url).data["contact_methods"], [])
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(reverse("blocked-users-list"), {"blocked_user": self.peer.pk}, format="json").status_code, 201)
        connection.refresh_from_db()
        self.assertEqual(connection.status, "cancelled")
        self.assertEqual(connection.message, "")
        block = self.user.blocked_users.get()
        self.assertEqual(self.client.delete(reverse("blocked-users-detail", args=[block.pk])).status_code, 204)
        connection.refresh_from_db(); self.assertEqual(connection.status, "cancelled")

    def test_export_and_confirmed_delete_remove_account_search_and_sessions(self):
        ProfileSearchIndex.objects.create(profile=self.profile, search_text="React")
        exported = self.client.get(reverse("account-export"))
        self.assertEqual(exported.data["account"]["email"], self.user.email)
        self.assertNotIn(self.peer.email, str(exported.data))
        self.assertEqual(self.client.post(reverse("account-delete"), {"confirmation": "wrong"}, format="json").status_code, 400)
        response = self.client.post(reverse("account-delete"), {"confirmation": self.user.email}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(ProfileSearchIndex.objects.exists())
        self.assertTrue(User.objects.filter(pk=self.peer.pk).exists())

    def test_pending_taxonomy_is_not_public_or_assignable(self):
        response = self.client.get(reverse("skills"))
        self.assertNotIn(self.pending.pk, [row["id"] for row in response.data["results"]])
        response = self.client.post(reverse("profile-skills-list"), {"skill": self.pending.pk, "confidence_level": "expert"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_network_analytics_are_staff_only(self):
        response = self.client.get(reverse("analytics-summary"))
        self.assertNotIn("network_summary", response.data)
        self.assertEqual(self.client.get(reverse("admin-analytics-summary")).status_code, 403)
        self.user.is_staff = True; self.user.save()
        self.assertEqual(self.client.get(reverse("admin-analytics-summary")).status_code, 200)
