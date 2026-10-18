from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from profiles.models import StudentProfile
from profiles.models import ContactMethod, Credential, ProfileSkill
from taxonomy.models import SkillCategory, SkillTag


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("student@illinois.edu", "pw", is_student_verified=True)
        self.client.force_authenticate(self.user)
        category = SkillCategory.objects.create(name="Technical", slug="technical")
        self.skill = SkillTag.objects.create(category=category, name="GitHub", slug="github")
        self.profile_data = {
            "display_name": "Student One",
            "major": "Computer Science",
            "year": "junior",
            "headline": "Can help with GitHub",
            "bio": "I like helping students learn collaboration workflows.",
            "preferred_contact_method": "email",
            "visibility": "public",
        }

    def create_profile(self):
        return self.client.post(reverse("profile-me"), self.profile_data, format="json")

    def test_authenticated_user_can_create_profile(self):
        response = self.create_profile()
        self.assertEqual(response.status_code, 201)
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_completed_onboarding)

    def test_user_cannot_create_two_profiles(self):
        self.create_profile()
        response = self.create_profile()
        self.assertEqual(response.status_code, 400)

    def test_user_can_add_profile_skill_contact_and_availability(self):
        self.create_profile()
        skill_response = self.client.post(reverse("profile-skills-list"), {"skill": self.skill.id, "confidence_level": "advanced"}, format="json")
        contact_response = self.client.post(reverse("contact-methods-list"), {"type": "email", "value": "student@illinois.edu"}, format="json")
        availability_response = self.client.post(reverse("availability-list"), {"day_of_week": "monday", "time_block": "evening"}, format="json")
        self.assertEqual(skill_response.status_code, 201)
        self.assertEqual(contact_response.status_code, 201)
        self.assertEqual(availability_response.status_code, 201)

    def test_public_discovery_requires_auth(self):
        self.client.force_authenticate(None)
        response = self.client.get(reverse("profiles-list"))
        self.assertEqual(response.status_code, 401)

    def test_private_profiles_do_not_appear_in_discovery(self):
        self.create_profile()
        profile = StudentProfile.objects.get(user=self.user)
        profile.visibility = "private"
        profile.save()
        response = self.client.get(reverse("profiles-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_non_owner_cannot_edit_another_profile(self):
        self.create_profile()
        other = User.objects.create_user("other@illinois.edu", "pw", is_student_verified=True)
        self.client.force_authenticate(other)
        response = self.client.patch(reverse("profile-me"), {"headline": "Nope"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_private_contact_and_credential_hidden_publicly(self):
        self.create_profile()
        profile = StudentProfile.objects.get(user=self.user)
        ContactMethod.objects.create(profile=profile, type="email", value="private@illinois.edu", is_public=False)
        Credential.objects.create(profile=profile, credential_type="resume", title="Private resume", visibility="private")
        viewer = User.objects.create_user("viewer@illinois.edu", "pw", is_student_verified=True)
        self.client.force_authenticate(viewer)
        response = self.client.get(reverse("profiles-detail", args=[profile.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["contact_methods"], [])
        self.assertEqual(response.data["credentials"], [])

    def test_similar_profiles_and_contact_click(self):
        self.create_profile()
        profile = StudentProfile.objects.get(user=self.user)
        ProfileSkill.objects.create(profile=profile, skill=self.skill, confidence_level="advanced")
        ContactMethod.objects.create(profile=profile, type="email", value="student@illinois.edu", is_public=True)
        other_user = User.objects.create_user("other@illinois.edu", "pw", is_student_verified=True)
        other_profile = StudentProfile.objects.create(user=other_user, display_name="Other", major="CS", year="senior", headline="GitHub help", bio="GitHub")
        ProfileSkill.objects.create(profile=other_profile, skill=self.skill, confidence_level="advanced")
        viewer = User.objects.create_user("viewer@illinois.edu", "pw", is_student_verified=True)
        self.client.force_authenticate(viewer)
        similar = self.client.get(reverse("profiles-similar", args=[profile.id]))
        self.assertEqual(similar.status_code, 200)
        self.assertEqual(similar.data["results"][0]["id"], other_profile.id)
        contact = profile.contact_methods.first()
        click = self.client.post(reverse("profile-contact-click", args=[profile.id]), {"contact_method_id": contact.id}, format="json")
        self.assertEqual(click.status_code, 403)


class ProfileAggregateTests(APITestCase):
    def setUp(self):
        from .models import ContactMethod
        self.user = User.objects.create_user("aggregate@illinois.edu", "password-234", is_student_verified=True)
        self.client.force_authenticate(self.user)
        self.profile = StudentProfile.objects.create(user=self.user, display_name="Original", major="CS", year="junior", headline="Help", bio="Original bio")
        ContactMethod.objects.create(profile=self.profile, type="email", value="original@illinois.edu", is_public=True)
        self.payload = {"profile": {"display_name": "Updated", "major": "CS", "year": "junior", "headline": "Help", "bio": "New bio"},
                        "skills": [], "availability": [], "contacts": [{"type": "email", "value": "new@illinois.edu", "is_public": True}], "credentials": []}

    def test_invalid_nested_data_preserves_every_saved_value(self):
        self.payload["credentials"] = [{"credential_type": "invalid", "title": "Bad", "url": "not-url"}]
        self.assertEqual(self.client.put(reverse("profile-aggregate"), self.payload, format="json").status_code, 400)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.display_name, "Original")
        self.assertEqual(self.profile.contact_methods.get().value, "original@illinois.edu")

    def test_late_failure_rolls_back_profile_and_children(self):
        from unittest.mock import patch
        with patch("profiles.views.rebuild_profile_search_index", side_effect=RuntimeError("index failure")):
            with self.assertRaises(RuntimeError):
                self.client.put(reverse("profile-aggregate"), self.payload, format="json")
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.display_name, "Original")
        self.assertEqual(self.profile.contact_methods.get().value, "original@illinois.edu")

    def test_success_is_repeatable_and_scoped_to_current_user(self):
        other = User.objects.create_user("other-aggregate@illinois.edu", "password-234", is_student_verified=True)
        other_profile = StudentProfile.objects.create(user=other, display_name="Other", major="CS", year="junior", headline="Help", bio="Other bio")
        self.payload["profile"]["id"] = other_profile.id
        for _ in range(2):
            response = self.client.put(reverse("profile-aggregate"), self.payload, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["id"], self.profile.id)
        self.assertEqual(self.profile.contact_methods.count(), 1)
        other_profile.refresh_from_db()
        self.assertEqual(other_profile.display_name, "Other")

    def test_onboarding_creation_and_anonymous_denial(self):
        self.profile.delete()
        self.assertEqual(self.client.put(reverse("profile-aggregate"), self.payload, format="json").status_code, 200)
        self.assertEqual(StudentProfile.objects.filter(user=self.user).count(), 1)
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_completed_onboarding)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.put(reverse("profile-aggregate"), self.payload, format="json").status_code, 401)

    def test_omitted_collection_is_preserved_during_section_save(self):
        del self.payload["contacts"]
        self.assertEqual(self.client.put(reverse("profile-aggregate"), self.payload, format="json").status_code, 200)
        self.assertEqual(self.profile.contact_methods.get().value, "original@illinois.edu")

    def test_first_profile_with_real_session_user(self):
        self.profile.delete()
        category = SkillCategory.objects.create(name="Session", slug="session")
        skill = SkillTag.objects.create(category=category, name="React", slug="react")
        self.client.force_authenticate(None)
        self.client.force_login(self.user, backend="django.contrib.auth.backends.ModelBackend")
        response = self.client.put("/api/profiles/me/aggregate/", {
            "profile": {**self.payload["profile"], "learning_goals": [skill.pk]},
            "skills": [{"skill": skill.pk, "confidence_level": "intermediate"}],
            "availability": [{"day_of_week": "wednesday", "time_block": "evening"}],
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_completed_onboarding)
