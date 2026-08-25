from django.core.management.base import BaseCommand

from discovery.models import ProfileSearchIndex
from discovery.services import rebuild_all_profile_search_indexes


class Command(BaseCommand):
    help = "Rebuild local keyword/semantic-style search indexes for all student profiles."

    def handle(self, *args, **options):
        rebuild_all_profile_search_indexes()
        self.stdout.write(self.style.SUCCESS(f"Rebuilt {ProfileSearchIndex.objects.count()} profile search indexes."))
