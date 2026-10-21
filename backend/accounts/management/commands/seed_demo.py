from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from accounts.demo import DEMO_EMAIL, seed_demo_network


class Command(BaseCommand):
    help = "Create the fictional local demo network when DEMO_MODE=true (never in production)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete and rebuild the demo network.")
        parser.add_argument("--if-enabled", action="store_true", help="Exit quietly when DEMO_MODE is off.")

    def handle(self, *args, reset=False, if_enabled=False, **options):
        if not settings.DEMO_MODE:
            if if_enabled:
                return
            raise CommandError("Demo data requires ENVIRONMENT=local and DEMO_MODE=true.")
        created = seed_demo_network(reset=reset)
        self.stdout.write(f"Demo network {'created' if created else 'already present'}; sign in as {DEMO_EMAIL} with the demo button.")
