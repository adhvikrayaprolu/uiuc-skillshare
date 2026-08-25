from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from profiles.models import ProfileSkill, StudentProfile
from taxonomy.models import SkillCategory, SkillTag
from interactions.models import BlockedUser


class DiscoveryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("a@illinois.edu", "pw", is_student_verified=True)
        self.client.force_authenticate(self.user)
        tech = SkillCategory.objects.create(name="Technical", slug="technical")
        career = SkillCategory.objects.create(name="Career", slug="career")
        experience = SkillCategory.objects.create(name="Experience", slug="experience")
        creative = SkillCategory.objects.create(name="Creative", slug="creative")

        self.figma = SkillTag.objects.create(category=tech, name="Figma", slug="figma")
        self.react = SkillTag.objects.create(category=tech, name="React", slug="react")
        self.github = SkillTag.objects.create(category=tech, name="GitHub", slug="github")
        self.resume = SkillTag.objects.create(category=career, name="Resume Review", slug="resume-review")
        self.linkedin = SkillTag.objects.create(category=career, name="LinkedIn Feedback", slug="linkedin-feedback")
        self.interview = SkillTag.objects.create(category=career, name="Interview Prep", slug="interview-prep")
        self.consulting = SkillTag.objects.create(category=career, name="Consulting Prep", slug="consulting-prep")
        self.research = SkillTag.objects.create(category=experience, name="Research Experience", slug="research-experience")
        self.project = SkillTag.objects.create(category=experience, name="Project Collaboration", slug="project-collaboration")

        helper_user = User.objects.create_user("b@illinois.edu", "pw", is_student_verified=True)
        self.design_profile = StudentProfile.objects.create(
            user=helper_user,
            display_name="Riya Patel",
            major="Computer Science",
            year="junior",
            headline="Product design and data tools",
            bio="Can help with Figma and React.",
        )
        ProfileSkill.objects.create(profile=self.design_profile, skill=self.figma, confidence_level="advanced")
        ProfileSkill.objects.create(profile=self.design_profile, skill=self.react, confidence_level="intermediate")
        self.design_profile.update_profile_completeness()

        resume_user = User.objects.create_user("career@illinois.edu", "pw", is_student_verified=True)
        self.resume_profile = StudentProfile.objects.create(
            user=resume_user,
            display_name="Maya Johnson",
            major="Information Sciences",
            year="senior",
            headline="Career mentor for resumes and networking",
            bio="I help with resumes, LinkedIn, and internship applications.",
            open_to_connect=True,
        )
        ProfileSkill.objects.create(profile=self.resume_profile, skill=self.resume, confidence_level="advanced")
        ProfileSkill.objects.create(profile=self.resume_profile, skill=self.linkedin, confidence_level="advanced")
        self.resume_profile.update_profile_completeness()

        consulting_user = User.objects.create_user("consulting@illinois.edu", "pw", is_student_verified=True)
        self.consulting_profile = StudentProfile.objects.create(
            user=consulting_user,
            display_name="Emily Chen",
            major="Business",
            year="junior",
            headline="Consulting and interview prep mentor",
            bio="Case interview practice and consulting prep help.",
            open_to_connect=True,
        )
        ProfileSkill.objects.create(profile=self.consulting_profile, skill=self.interview, confidence_level="advanced")
        ProfileSkill.objects.create(profile=self.consulting_profile, skill=self.consulting, confidence_level="advanced")
        self.consulting_profile.update_profile_completeness()

        collaborator_user = User.objects.create_user("collab@illinois.edu", "pw", is_student_verified=True)
        self.collab_profile = StudentProfile.objects.create(
            user=collaborator_user,
            display_name="Arjun Mehta",
            major="Math + CS",
            year="junior",
            headline="React project collaborator",
            bio="I collaborate on React apps and GitHub workflows.",
            open_to_connect=True,
        )
        ProfileSkill.objects.create(profile=self.collab_profile, skill=self.react, confidence_level="advanced")
        ProfileSkill.objects.create(profile=self.collab_profile, skill=self.github, confidence_level="advanced")
        ProfileSkill.objects.create(profile=self.collab_profile, skill=self.project, confidence_level="intermediate")
        self.collab_profile.update_profile_completeness()

        research_user = User.objects.create_user("research@illinois.edu", "pw", is_student_verified=True)
        self.research_profile = StudentProfile.objects.create(
            user=research_user,
            display_name="Daniel Kim",
            major="Statistics",
            year="senior",
            headline="Research and data analysis mentor",
            bio="Research lab experience with Python and data analysis.",
            open_to_connect=True,
        )
        ProfileSkill.objects.create(profile=self.research_profile, skill=self.research, confidence_level="advanced")
        self.research_profile.update_profile_completeness()

    def test_discovery_returns_matching_skill_profiles(self):
        response = self.client.get(reverse("discovery-search"), {"q": "Figma"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], self.design_profile.id)
        self.assertGreater(response.data["results"][0]["match_score"], 0)
        self.assertTrue(response.data["results"][0]["match_reasons"])

    def test_recommended_profiles_endpoint(self):
        StudentProfile.objects.create(
            user=self.user,
            display_name="Current User",
            major="CS",
            year="junior",
            headline="I like design",
            bio="Figma and product work",
            interests="design",
        )
        response = self.client.get(reverse("discovery-recommended"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], self.design_profile.id)

    def test_blocked_profile_excluded_from_discovery(self):
        BlockedUser.objects.create(blocker=self.user, blocked_user=self.design_profile.user)
        response = self.client.get(reverse("discovery-search"), {"q": "Figma"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_semantic_mode_returns_ai_metadata(self):
        response = self.client.get(reverse("discovery-search"), {"q": "design portfolio help", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("ai", response.data)
        self.assertTrue(response.data["ai"]["enabled"])
        self.assertEqual(response.data["ai"]["mode"], "local_weighted_semantic_matcher")

    def test_empty_semantic_query_falls_back_to_default(self):
        response = self.client.get(reverse("discovery-search"), {"q": "", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["ai"]["enabled"])

    def test_semantic_resume_help_returns_career_profile(self):
        response = self.client.get(reverse("discovery-search"), {"q": "resume help", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        top = response.data["results"][0]
        self.assertEqual(top["id"], self.resume_profile.id)
        self.assertTrue(any("Resume" in reason or "LinkedIn" in reason for reason in top["semantic_reasons"]))

    def test_semantic_react_collaborator_returns_react_profile(self):
        response = self.client.get(reverse("discovery-search"), {"q": "React project collaborator", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        top = response.data["results"][0]
        self.assertEqual(top["id"], self.collab_profile.id)
        self.assertTrue(top["semantic_reasons"])

    def test_semantic_consulting_interview_returns_consulting_profile(self):
        response = self.client.get(reverse("discovery-search"), {"q": "consulting interview prep", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.data["results"][:3]]
        self.assertIn(self.consulting_profile.id, ids)

    def test_semantic_github_setup_returns_github_profile(self):
        response = self.client.get(reverse("discovery-search"), {"q": "help me set up github", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.data["results"][:3]]
        self.assertIn(self.collab_profile.id, ids)

    def test_semantic_research_advice_returns_research_profile(self):
        response = self.client.get(reverse("discovery-search"), {"q": "research advice", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.data["results"][:3]]
        self.assertIn(self.research_profile.id, ids)

    def test_semantic_nonsense_query_is_stable(self):
        response = self.client.get(reverse("discovery-search"), {"q": "zzzz qqqq", "mode": "semantic"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
