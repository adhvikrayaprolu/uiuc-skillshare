import json
import time
from pathlib import Path
from statistics import median
from django.db import connection, reset_queries
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APITestCase
from accounts.models import User
from profiles.models import ProfileSkill, StudentProfile
from .models import ProfileSearchIndex
from .services import rebuild_all_profile_search_indexes
from .tests import DiscoveryTests


class RankingEvaluationTests(APITestCase):
    def setUp(self):
        DiscoveryTests.setUp(self)
        for skill, aliases in [(self.react, ['frontend', 'reactjs', 'react.js']), (self.resume, ['resume', 'cv', 'curriculum vitae', 'application feedback']), (self.research, ['research', 'lab', 'laboratory'])]:
            skill.aliases = aliases
            skill.save()
        users = User.objects.bulk_create([User(email=f'corpus-{i}@illinois.edu', is_student_verified=True, password='!') for i in range(220)])
        profiles = StudentProfile.objects.bulk_create([StudentProfile(user=user, display_name=f'Corpus helper {i}', major='Other', year='other', headline='General study support', bio='Study organization and habits', availability_notes='By arrangement') for i, user in enumerate(users)])
        ProfileSkill.objects.bulk_create([ProfileSkill(profile=profile, skill=self.github) for profile in profiles])
        ProfileSearchIndex.objects.bulk_create([ProfileSearchIndex(profile=profile, search_text='GitHub General study support organization habits') for profile in profiles])
        for profile in [self.design_profile, self.collab_profile, self.resume_profile, self.research_profile, self.consulting_profile]:
            from .services import rebuild_profile_search_index
            rebuild_profile_search_index(profile)

    def test_labeled_tasks_recall_at_three(self):
        tasks = json.loads((Path(__file__).parent/'fixtures/relevance.json').read_text())
        hits = 0
        for task in tasks:
            response = self.client.get(reverse('discovery-search'), {'q': task['task']})
            self.assertEqual(response.status_code, 200)
            skills = [skill for row in response.data['results'][:3] for skill in row['top_skills']]
            hits += task['skill'] in skills
        self.assertGreaterEqual(hits/len(tasks), .9)
        print(f'Keyword relevance fixtures: {hits}/{len(tasks)} covered tasks have suitable helpers in top three; live semantic quality unverified.')

    def test_query_count_bounded_candidates_and_latency(self):
        timings = []
        for _ in range(5):
            reset_queries()
            start = time.perf_counter()
            with CaptureQueriesContext(connection) as queries:
                response = self.client.get(reverse('discovery-search'))
            timings.append((time.perf_counter()-start)*1000)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data['matching']['bounded'])
            self.assertEqual(response.data['count'], 200)
            self.assertGreater(len(queries), 0, "Query instrumentation must record actual database work")
            self.assertLessEqual(len(queries), 16, [q['sql'] for q in queries])
        self.assertIsNotNone(response.data['next'])
        query_count = len(queries)
        second = self.client.get(reverse('discovery-search'), {'page': 2})
        self.assertTrue(set(r['id'] for r in second.data['results']).isdisjoint(r['id'] for r in response.data['results']))
        print(f'Ranking corpus: 225 peers; {connection.vendor}; queries={query_count}; median={median(timings):.1f}ms; max={max(timings):.1f}ms; candidate limit=200.')

    def test_learning_goals_not_offered_skills_and_honest_fallback(self):
        own = StudentProfile.objects.create(user=self.user, display_name='Learner', major='CS', year='other', headline='React helper', bio='React')
        ProfileSkill.objects.create(profile=own, skill=self.react)
        own.learning_goals.add(self.resume)
        response = self.client.get(reverse('discovery-recommended'))
        self.assertEqual(response.data['matching']['recommendation_basis'], 'learning_goals')
        self.assertEqual(response.data['results'][0]['id'], self.resume_profile.pk)
        own.learning_goals.clear()
        self.assertEqual(self.client.get(reverse('discovery-recommended')).data['matching']['recommendation_basis'], 'discovery_suggestions')
        self.assertEqual(self.client.get(reverse('discovery-search'), {'q': 'xylophone quantum zebra'}).data['results'], [])

    def test_demographics_and_profile_edit_do_not_boost_ranking(self):
        query = {'q': 'React'}
        before = self.client.get(reverse('discovery-search'), query).data['results']
        self.design_profile.major = 'Computer Science prestige'; self.design_profile.year = 'graduate'
        self.design_profile.save()
        after = self.client.get(reverse('discovery-search'), query).data['results']
        self.assertEqual([(r['id'], r['match_score']) for r in before], [(r['id'], r['match_score']) for r in after])
