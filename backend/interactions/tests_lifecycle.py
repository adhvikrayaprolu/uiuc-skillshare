import uuid
from concurrent.futures import ThreadPoolExecutor
from django.db import close_old_connections, connection, connections
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from profiles.models import ProfileSkill
from taxonomy.models import SkillTag
from .models import HelpRequest, Review
from .tests import InteractionTests


class LifecycleTests(APITestCase):
    setUp = InteractionTests.setUp

    def create_request(self, **changes):
        payload = {"helper_profile": self.helper_profile.pk, "topic": "GitHub help", "message": "Review my repository", "related_skill": self.skill.pk, "urgency": "medium", "idempotency_key": str(uuid.uuid4())}
        payload.update(changes)
        return self.client.post(reverse("help-requests-list"), payload, format="json")

    def test_duplicate_submissions_and_topics(self):
        key = str(uuid.uuid4())
        first = self.create_request(idempotency_key=key)
        second = self.create_request(idempotency_key=key)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(HelpRequest.objects.count(), 1)
        self.assertEqual(self.create_request(idempotency_key=key, message="Changed").status_code, 409)
        self.assertEqual(self.create_request(topic="  GITHUB  help ").status_code, 409)

    def test_version_role_skill_and_feedback_boundaries(self):
        unrelated = SkillTag.objects.create(category=self.skill.category, name="Other", slug="other")
        self.assertEqual(self.create_request(related_skill=unrelated.pk).status_code, 400)
        created = self.create_request()
        url = reverse("help-requests-detail", args=[created.data["id"]])
        feedback = reverse("profile-reviews", args=[self.helper_profile.pk])
        payload = {"help_request": created.data["id"], "rating": 5, "comment": "Helpful"}
        self.assertEqual(self.client.post(feedback, payload, format="json").status_code, 400)
        self.client.force_authenticate(self.helper_user)
        self.assertEqual(self.client.patch(url, {"status": "accepted"}, format="json").status_code, 400)
        accepted = self.client.patch(url, {"status": "accepted", "version": 1}, format="json")
        self.assertEqual(accepted.data["version"], 2)
        self.assertEqual(self.client.patch(url, {"status": "completed", "version": 1}, format="json").status_code, 409)
        completed = self.client.patch(url, {"status": "completed", "version": 2}, format="json")
        self.assertEqual(completed.data["version"], 3)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(feedback, payload, format="json").status_code, 201)
        self.assertEqual(self.client.post(feedback, payload, format="json").status_code, 400)
        endorsement = reverse("profile-endorsements", args=[self.helper_profile.pk])
        self.assertEqual(self.client.post(endorsement, {"help_request": created.data["id"]}, format="json").status_code, 400)
        self.assertEqual(self.client.post(endorsement, {"help_request": created.data["id"], "skill": self.skill.pk}, format="json").status_code, 201)
        self.assertEqual(self.client.get(reverse("help-requests-list")).data["results"][0]["status"], "completed")

    def test_unverified_legacy_feedback_and_private_authors_do_not_contribute(self):
        Review.objects.create(reviewer=self.user, profile=self.helper_profile, rating=5, comment="Legacy")
        self.assertEqual(self.client.get(reverse("profile-reviews", args=[self.helper_profile.pk])).data["count"], 0)
        request = HelpRequest.objects.create(seeker=self.user, helper_profile=self.helper_profile, topic="Done", message="Done", status="completed")
        Review.objects.create(reviewer=self.user, profile=self.helper_profile, help_request=request, rating=4, comment="Verified")
        self.assertEqual(self.client.get(reverse("profiles-detail", args=[self.helper_profile.pk])).data["review_count"], 1)
        self.profile.visibility = "private"
        self.profile.save()
        self.assertEqual(self.client.get(reverse("profiles-detail", args=[self.helper_profile.pk])).data["review_count"], 0)

    def test_daily_limit(self):
        for index in range(10):
            HelpRequest.objects.create(seeker=self.user, helper_profile=self.helper_profile, topic=str(index), message="help", status="declined")
        self.assertEqual(self.create_request().status_code, 400)


class PostgreSQLConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        InteractionTests.setUp(self)

    def test_simultaneous_accept_and_decline_cannot_both_commit(self):
        if connection.vendor != "postgresql":
            self.skipTest("PostgreSQL row locking is required")
        from threading import Barrier
        request = HelpRequest.objects.create(seeker=self.user, helper_profile=self.helper_profile, topic="Concurrent", message="Help")
        barrier = Barrier(2)
        def transition(status):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(self.helper_user)
                barrier.wait(timeout=10)
                return client.patch(reverse("help-requests-detail", args=[request.pk]), {"status": status, "version": 1}, format="json").status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(transition, ["accepted", "declined"]))
        self.assertEqual(results.count(200), 1, results)
        self.assertIn(next(code for code in results if code != 200), [400, 409])
        request.refresh_from_db()
        self.assertEqual(request.version, 2)
