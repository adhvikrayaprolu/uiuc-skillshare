from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from .models import SkillCategory, SkillTag


class PublicCatalogueTests(APITestCase):
    def setUp(self):
        self.category = SkillCategory.objects.create(name="Technical", slug="technical")
        SkillTag.objects.create(category=self.category, name="React", slug="react")
        member = User.objects.create_user("suggester@illinois.edu", is_student_verified=True)
        SkillTag.objects.create(category=self.category, name="Pending idea", slug="pending-idea", is_approved=False, created_by=member)

    def test_signed_out_visitors_see_only_approved_catalogue(self):
        self.assertEqual(self.client.get(reverse("skill-categories")).status_code, 200)
        response = self.client.get(reverse("skills"), {"is_approved": "false"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"], [])
        names = [row["name"] for row in self.client.get(reverse("skills")).data["results"]]
        self.assertEqual(names, ["React"])

    def test_member_counts_and_suggestions_stay_member_only(self):
        self.assertIn(self.client.get(reverse("skills-popular")).status_code, (401, 403))
        self.assertIn(self.client.post(reverse("skills-suggest"), {"category": self.category.pk, "name": "X"}).status_code, (401, 403))
