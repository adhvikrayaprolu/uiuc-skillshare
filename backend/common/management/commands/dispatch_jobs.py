import signal
from threading import Event
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from common.notifications import enqueue_due_emails


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
            try:
                enqueue_due_emails()
            except Exception as error:
                self.stderr.write(f"Dispatcher retry: {type(error).__name__}")
            if not options["loop"] or stopped.wait(5):
                break
