from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User
from profiles.models import StudentProfile, ProfileSkill
from interactions.models import SavedProfile, HelpRequest, Review, BlockedUser
from taxonomy.models import SkillCategory, SkillTag
from .models import AvatarDeletion
from .avatar_cleanup import schedule_avatar_deletion, enqueue_due_avatar_deletions, delete_avatar


class AvatarCleanupTests(TestCase):
    def test_retry_then_delete_is_durable_and_idempotent(self):
        name = 'profile_pictures/'+'a'*32+'.jpg'
        schedule_avatar_deletion(name); schedule_avatar_deletion(name)
        job = AvatarDeletion.objects.get()
        with patch('common.avatar_cleanup.default_storage.delete', side_effect=OSError('private provider details')):
            delete_avatar(job.pk)
        job.refresh_from_db()
        self.assertEqual(job.attempts, 1)
        self.assertEqual(job.last_error, 'storage_unavailable')
        self.assertGreater(job.next_attempt_at, timezone.now())
        AvatarDeletion.objects.filter(pk=job.pk).update(next_attempt_at=timezone.now())
        with patch('common.avatar_cleanup.default_storage.delete') as delete:
            delete_avatar(job.pk); delete_avatar(job.pk)
        delete.assert_called_once_with(name)
        self.assertFalse(AvatarDeletion.objects.exists())

    @patch('common.avatar_cleanup.django_rq.get_queue')
    def test_queue_failure_preserves_job_and_lease(self, queue):
        schedule_avatar_deletion('profile_pictures/'+'c'*32+'.jpg')
        queue.side_effect = RuntimeError('redis unavailable')
        self.assertEqual(enqueue_due_avatar_deletions(), 1)
        job = AvatarDeletion.objects.get()
        self.assertEqual(job.last_error, 'queue_unavailable')
        self.assertGreater(job.queued_until, timezone.now())
        self.assertEqual(enqueue_due_avatar_deletions(), 0)


class AggregatePrivacyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('counts@illinois.edu', is_student_verified=True)
        self.peer = User.objects.create_user('private-counts@illinois.edu', is_student_verified=True)
        self.profile = StudentProfile.objects.create(user=self.user, display_name='Counts', major='CS', year='junior', headline='Help', bio='Bio', visibility='public')
        self.other = StudentProfile.objects.create(user=self.peer, display_name='Private', major='CS', year='junior', headline='Help', bio='Bio', visibility='private')
        category = SkillCategory.objects.create(name='Technical', slug='technical')
        self.private_skill = SkillTag.objects.create(name='A private skill', slug='private', category=category)
        self.public_skill = SkillTag.objects.create(name='Z public skill', slug='public', category=category)
        ProfileSkill.objects.create(profile=self.other, skill=self.private_skill)
        ProfileSkill.objects.create(profile=self.profile, skill=self.public_skill)
        SavedProfile.objects.create(seeker=self.user, saved_profile=self.other)
        connection = HelpRequest.objects.create(seeker=self.peer, helper_profile=self.profile, status='completed', topic='Counts', message='Help')
        Review.objects.create(reviewer=self.peer, profile=self.profile, help_request=connection, rating=5, comment='Hidden')
        HelpRequest.objects.create(seeker=self.user, helper_profile=self.other, status='pending', topic='Outgoing', message='Private')
        HelpRequest.objects.create(seeker=self.peer, helper_profile=self.profile, status='pending', topic='Incoming', message='Private')
        self.client.force_authenticate(self.user)

    def test_private_and_blocked_contributions_are_absent_from_personal_counts(self):
        for blocked in [False, True]:
            if blocked:
                self.other.visibility = 'public'; self.other.save()
                BlockedUser.objects.create(blocker=self.peer, blocked_user=self.user)
            dashboard = self.client.get(reverse('dashboard')).data
            for field in ['saved_profile_count', 'connections_count', 'review_count', 'incoming_help_request_count', 'outgoing_help_request_count']:
                self.assertEqual(dashboard[field], 0, field)
            summary = self.client.get(reverse('analytics-summary')).data['user_summary']
            self.assertEqual(summary['connections_count'], 0)
            self.assertEqual(summary['active_help_requests_count'], 0)
            self.assertEqual(summary['saved_profiles_count'], 0)
            skills = self.client.get(reverse('bootstrap')).data['popular_skills']
            self.assertEqual(skills[0]['id'], self.public_skill.pk)

    def test_shared_cache_failure_marks_readiness_unavailable(self):
        with patch('django.core.cache.cache.set', side_effect=RuntimeError('cache unavailable')):
            self.assertEqual(self.client.get(reverse('readiness')).status_code, 503)
            self.assertEqual(self.client.get(reverse('liveness')).status_code, 200)
