from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from accounts.models import User


class Command(BaseCommand):
    help = 'Remove synthetic Playwright accounts from the local Compose test stack.'

    def handle(self, *args, **options):
        if not settings.LOCAL_DEVELOPMENT:
            raise CommandError('Browser fixtures can only be removed in ENVIRONMENT=local.')
        # Strict full match, rather than deleting all users with a broad prefix.
        users = User.objects.filter(email__regex=r'^e2e-(helper|seeker)-[0-9]{13}@illinois\.edu$')
        count = users.count()
        users.delete()
        self.stdout.write(f'Removed {count} local browser fixture accounts.')
