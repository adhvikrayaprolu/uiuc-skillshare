from types import SimpleNamespace
from unittest.mock import patch
from django.core.cache import cache
from django.db import connection
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from interactions.models import BlockedUser
from interactions.tests import InteractionTests
from . import ai
from .embedding_jobs import enqueue_due_embeddings, update_embedding
from .models import EmbeddingJob, ProfileSearchIndex
from .services import rebuild_profile_search_index


def vector(axis=0):
    values = [0.] * ai.DIMENSIONS
    values[axis] = 1.
    return values


class SemanticTests(APITestCase):
    def setUp(self):
        InteractionTests.setUp(self)
        cache.delete(f'embedding-calls:{timezone.now().date().isoformat()}')

    def index_fixture(self):
        self.helper_profile.embedding_consent = True
        self.helper_profile.save()
        index = rebuild_profile_search_index(self.helper_profile)
        index.refresh_from_db()
        return index

    @override_settings(AI_PAID_CALLS_ENABLED=False, OPENAI_API_KEY='fixture-never-real', AI_DAILY_CALL_LIMIT=10)
    def test_disabled_budget_never_constructs_provider_or_enqueues(self):
        self.index_fixture()
        with patch('discovery.ai.OpenAI') as client, patch('discovery.embedding_jobs.django_rq.get_queue') as queue:
            with self.assertRaisesRegex(ai.SemanticUnavailable, 'paid_calls_disabled'):
                ai.get_embedding('GitHub')
            self.assertEqual(enqueue_due_embeddings(), 0)
            response = self.client.get(reverse('discovery-search'), {'q': 'GitHub', 'mode': 'semantic'})
            self.assertEqual(response.data['matching']['fallback_reason'], 'paid_calls_disabled')
            self.assertEqual(response.data['results'][0]['id'], self.helper_profile.pk)
            client.assert_not_called(); queue.assert_not_called()

    @override_settings(AI_PAID_CALLS_ENABLED=True, OPENAI_API_KEY='fixture-never-real', AI_DAILY_CALL_LIMIT=1)
    def test_provider_contract_dimensions_model_budget_and_timeouts(self):
        with patch('discovery.ai.OpenAI') as constructor:
            client = constructor.return_value.__enter__.return_value
            client.embeddings.create.return_value = SimpleNamespace(model=ai.MODEL, data=[SimpleNamespace(embedding=vector())])
            self.assertEqual(ai.get_embedding('Published GitHub skill'), vector())
            constructor.assert_called_once_with(api_key='fixture-never-real', timeout=5, max_retries=0)
            client.embeddings.create.assert_called_once_with(model=ai.MODEL, input='Published GitHub skill', dimensions=1536, encoding_format='float')
            with self.assertRaisesRegex(ai.SemanticUnavailable, 'daily_call_limit'):
                ai.get_embedding('Second call')
            self.assertEqual(client.embeddings.create.call_count, 1)
        for invalid in [[1.], [float('nan')]*1536, [0.]*1536]:
            with self.assertRaises(ai.SemanticUnavailable):
                ai.validate_vector(invalid)

    @override_settings(AI_PAID_CALLS_ENABLED=True, OPENAI_API_KEY='fixture-never-real', AI_DAILY_CALL_LIMIT=10)
    def test_sdk_failures_wrong_models_and_zero_budget_fail_closed(self):
        with patch('discovery.ai.OpenAI') as constructor:
            client = constructor.return_value.__enter__.return_value
            client.embeddings.create.side_effect = TimeoutError
            with self.assertRaisesRegex(ai.SemanticUnavailable, 'provider_unavailable'):
                ai.get_embedding('Published skill')
            client.embeddings.create.side_effect = None
            client.embeddings.create.return_value = SimpleNamespace(model='another-model', data=[SimpleNamespace(embedding=vector())])
            with self.assertRaisesRegex(ai.SemanticUnavailable, 'invalid_provider_model'):
                ai.get_embedding('Published skill')
            with override_settings(AI_DAILY_CALL_LIMIT=0):
                with self.assertRaisesRegex(ai.SemanticUnavailable, 'zero_call_budget'):
                    ai.get_embedding('Published skill')
            self.assertEqual(constructor.call_count, 2)

    @override_settings(AI_PAID_CALLS_ENABLED=True, OPENAI_API_KEY='fixture-never-real', AI_DAILY_CALL_LIMIT=10)
    def test_content_hash_jobs_provider_failure_and_excluded_fields(self):
        self.helper_profile.learning_goal_notes = 'Private learning goal'
        self.helper_profile.major = 'Sensitive background'
        self.helper_profile.save()
        index = self.index_fixture()
        job = EmbeddingJob.objects.get(index=index)
        from .embedding_jobs import embedding_text
        self.assertNotIn('person@example.org', embedding_text('Ask person@example.org or +1 (217) 555-1212 at https://example.org/private'))
        for forbidden in [self.helper_user.email, 'Private learning goal', 'Sensitive background']:
            self.assertNotIn(forbidden, index.search_text)
        with patch('discovery.embedding_jobs.ai.get_embedding', side_effect=ai.SemanticUnavailable('provider_unavailable')):
            update_embedding(job.pk)
        job.refresh_from_db()
        self.assertEqual(job.attempts, 1)
        self.assertGreater(job.next_attempt_at, timezone.now())
        EmbeddingJob.objects.filter(pk=job.pk).update(next_attempt_at=timezone.now())
        with patch('discovery.embedding_jobs.ai.get_embedding', return_value=vector()):
            update_embedding(job.pk)
        index.refresh_from_db()
        self.assertEqual(index.embedding_model, ai.MODEL)
        self.assertEqual(index.embedding_hash, index.content_hash)
        self.assertFalse(EmbeddingJob.objects.filter(pk=job.pk).exists())
        digest = index.content_hash
        self.helper_profile.bio = 'New published text'
        self.helper_profile.save()
        rebuild_profile_search_index(self.helper_profile)
        index.refresh_from_db()
        self.assertNotEqual(index.content_hash, digest)
        self.assertIsNone(index.vector)
        self.assertTrue(EmbeddingJob.objects.filter(index=index).exists())

    @override_settings(AI_PAID_CALLS_ENABLED=True, OPENAI_API_KEY='fixture-never-real', AI_DAILY_CALL_LIMIT=10)
    def test_consent_privacy_deletion_and_stale_result_never_restore_vector(self):
        index = self.index_fixture()
        job = EmbeddingJob.objects.get(index=index)
        def withdraw(_):
            self.helper_profile.embedding_consent = False
            self.helper_profile.save()
            rebuild_profile_search_index(self.helper_profile)
            return vector()
        with patch('discovery.embedding_jobs.ai.get_embedding', side_effect=withdraw):
            update_embedding(job.pk)
        index.refresh_from_db()
        self.assertIsNone(index.vector)
        self.assertFalse(EmbeddingJob.objects.exists())
        self.helper_profile.visibility = 'private'; self.helper_profile.save()
        rebuild_profile_search_index(self.helper_profile)
        self.assertFalse(ProfileSearchIndex.objects.filter(pk=index.pk).exists())
        self.helper_profile.visibility = 'public'; self.helper_profile.save()
        self.index_fixture()
        self.helper_user.delete()
        self.assertFalse(ProfileSearchIndex.objects.exists())
        self.assertFalse(EmbeddingJob.objects.exists())

    @override_settings(AI_PAID_CALLS_ENABLED=True, OPENAI_API_KEY='fixture-never-real', AI_DAILY_CALL_LIMIT=10)
    def test_independent_pgvector_retrieval_model_isolation_and_blocking(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Cosine distance requires PostgreSQL/pgvector')
        index = self.index_fixture()
        ProfileSearchIndex.objects.filter(pk=index.pk).update(vector=vector(), embedding_hash=index.content_hash, embedding_model=ai.MODEL, embedding_version=ai.VERSION)
        with patch('discovery.semantic.ai.get_embedding', return_value=vector()):
            query = {'q': 'Unfamiliar phrasing zzzz qqqq', 'mode': 'semantic'}
            response = self.client.get(reverse('discovery-search'), query)
            self.assertEqual(response.data['matching']['mode'], 'hybrid')
            self.assertEqual(response.data['results'][0]['id'], self.helper_profile.pk)
            ProfileSearchIndex.objects.filter(pk=index.pk).update(embedding_model='different-model')
            self.assertEqual(self.client.get(reverse('discovery-search'), query).data['results'], [])
            ProfileSearchIndex.objects.filter(pk=index.pk).update(embedding_model=ai.MODEL)
            BlockedUser.objects.create(blocker=self.helper_user, blocked_user=self.user)
            self.assertEqual(self.client.get(reverse('discovery-search'), query).data['results'], [])
