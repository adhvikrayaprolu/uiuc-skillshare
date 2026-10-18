import time
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from accounts.models import User
from profiles.models import Availability, ProfileSkill, StudentProfile
from taxonomy.models import SkillTag


class Command(BaseCommand):
    help = 'Create 23 explicitly synthetic local browser fixtures for discovery pagination.'

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.LOCAL_DEVELOPMENT:
            raise CommandError('Browser fixtures require ENVIRONMENT=local.')
        skill = SkillTag.objects.get(name='GitHub', is_approved=True)
        stamp = int(time.time() * 1000)
        for number in range(23):
            user = User.objects.create_user(email=f'e2e-helper-{stamp+number}@illinois.edu', is_student_verified=True, has_completed_onboarding=True)
            profile = StudentProfile.objects.create(user=user, display_name=f'Local pagination fixture {number+1:02}', major='Test', year='other', headline='GitHub collaboration', bio='Synthetic local browser fixture, not a real member.', visibility='public')
            ProfileSkill.objects.create(profile=profile, skill=skill, confidence_level='beginner')
            Availability.objects.create(profile=profile, day_of_week='flexible', time_block='flexible')
        self.stdout.write('Created 23 local browser fixtures; cleanup_e2e removes them.')
