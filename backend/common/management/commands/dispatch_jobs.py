import signal
from threading import Event
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from common.avatar_cleanup import enqueue_due_avatar_deletions
from common.notifications import enqueue_due_emails
from common.retention import send_skill_alerts, send_weekly_digests
from discovery.embedding_jobs import enqueue_due_embeddings
from interactions.expiry import process_pending_requests

# Each job runs independently so one failing job never starves the others.
JOBS = (enqueue_due_emails, enqueue_due_embeddings, enqueue_due_avatar_deletions, process_pending_requests, send_skill_alerts, send_weekly_digests)


class Command(BaseCommand):
    help = "Dispatch durable outbox jobs; retry queue outages without losing events."
    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")
    def handle(self, *args, **options):
        stopped = Event()
        signal.signal(signal.SIGTERM, lambda *_: stopped.set())
        signal.signal(signal.SIGINT, lambda *_: stopped.set())
        while not stopped.is_set():
            close_old_connections()
            for job in JOBS:
                try:
                    job()
                except Exception as error:
                    self.stderr.write(f"Dispatcher retry: {job.__name__} {type(error).__name__}")
            if not options["loop"] or stopped.wait(5):
                break
