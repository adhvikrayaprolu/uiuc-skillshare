from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from interactions.models import HelpRequest, Review
from profiles.models import Availability, ProfileSkill, StudentProfile
from taxonomy.models import SkillCategory, SkillTag


class HomePayloadTests(APITestCase):
    def setUp(self):
        category = SkillCategory.objects.create(name="Technical", slug="technical")
        self.react = SkillTag.objects.create(category=category, name="React", slug="react")
        self.figma = SkillTag.objects.create(category=category, name="Figma", slug="figma")
        self.me = User.objects.create_user("me@illinois.edu", is_student_verified=True)
        self.peer = User.objects.create_user("peer@illinois.edu", is_student_verified=True)
        self.my_profile = StudentProfile.objects.create(user=self.me, display_name="Me", major="CS", year="junior", headline="React", bio="", visibility="public")
        self.peer_profile = StudentProfile.objects.create(user=self.peer, display_name="Peer", major="Design", year="senior", headline="Figma", bio="Bio", visibility="public")
        ProfileSkill.objects.create(profile=self.my_profile, skill=self.react, confidence_level="advanced")
        ProfileSkill.objects.create(profile=self.peer_profile, skill=self.figma, confidence_level="advanced")
        self.client.force_authenticate(self.me)

    def make_request(self, seeker, helper_profile, skill, status, topic):
        return HelpRequest.objects.create(seeker=seeker, helper_profile=helper_profile, topic=topic, message="m", related_skill=skill, status=status)

    def test_attention_items_cover_respond_complete_and_feedback(self):
        incoming = self.make_request(self.peer, self.my_profile, self.react, "pending", "Incoming")
        accepted = self.make_request(self.me, self.peer_profile, self.figma, "accepted", "Accepted")
        completed = self.make_request(self.me, self.peer_profile, self.figma, "completed", "Completed")
        self.make_request(self.me, self.peer_profile, self.figma, "pending", "Waiting on peer")
        self.make_request(self.peer, self.my_profile, self.react, "declined", "Declined")
        items = self.client.get(reverse("dashboard")).data["attention_items"]
        self.assertEqual([(i["action"], i["request_id"]) for i in items], [("respond", incoming.pk), ("complete", accepted.pk), ("feedback", completed.pk)])
        self.assertEqual(items[0]["peer"], {"name": "Peer", "profile_id": self.peer_profile.pk})
        Review.objects.create(reviewer=self.me, profile=self.peer_profile, help_request=completed, rating=5, comment="Great")
        items = self.client.get(reverse("dashboard")).data["attention_items"]
        self.assertNotIn("feedback", [i["action"] for i in items])

    def test_hidden_peer_requests_are_not_attention_items(self):
        self.make_request(self.peer, self.my_profile, self.react, "pending", "Incoming")
        self.peer_profile.visibility = "private"
        self.peer_profile.save()
        self.assertEqual(self.client.get(reverse("dashboard")).data["attention_items"], [])

    def test_checklist_reports_optional_profile_improvements(self):
        checklist = {item["key"]: item["done"] for item in self.client.get(reverse("dashboard")).data["checklist"]}
        self.assertEqual(checklist, {"publish": True, "bio": False, "second_skill": False, "contacts": False, "avatar": False, "evidence": False})


class SetupRuleTests(APITestCase):
    def setUp(self):
        category = SkillCategory.objects.create(name="Technical", slug="technical")
        self.skill = SkillTag.objects.create(category=category, name="React", slug="react")
        self.goal = SkillTag.objects.create(category=category, name="Figma", slug="figma")
        self.user = User.objects.create_user("setup@illinois.edu", is_student_verified=True)
        self.client.force_authenticate(self.user)

    def payload(self, **profile):
        return {"profile": {"display_name": "Setup", "major": "CS", "year": "junior", "headline": "React help", "bio": "", "learning_goals": [self.goal.pk], **profile},
                "skills": [{"skill": self.skill.pk, "confidence_level": "intermediate"}],
                "availability": [{"day_of_week": "monday", "time_block": "evening"}]}

    def test_bio_is_optional_but_a_learning_goal_is_required(self):
        response = self.client.put(reverse("profile-aggregate"), self.payload(), format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_completed_onboarding)
        self.client.put(reverse("profile-aggregate"), self.payload(learning_goals=[]), format="json")
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_completed_onboarding)
        self.assertEqual(self.client.get(reverse("onboarding-status")).data["missing_steps"], ["add_learning_goals"])

    def test_missing_availability_blocks_completion(self):
        payload = self.payload()
        payload["availability"] = []
        self.client.put(reverse("profile-aggregate"), payload, format="json")
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_completed_onboarding)
        self.assertFalse(Availability.objects.exists())
