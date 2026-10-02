from datetime import timedelta
from unittest.mock import patch
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from interactions.models import BlockedUser, HelpRequest
from interactions.tests import InteractionTests
from .models import EmailDelivery, Notification
from .notifications import deliver_email, enqueue_due_emails, notify_request


class NotificationTests(APITestCase):
    setUp = InteractionTests.setUp

    def test_transactional_events_deduplicate_and_read_state_is_private(self):
        created = self.client.post(reverse("help-requests-list"), {"helper_profile": self.helper_profile.pk, "topic": "Git", "message": "Help"}, format="json")
        interaction = HelpRequest.objects.get(pk=created.data["id"])
        notify_request(interaction, "created", self.user.pk)
        self.assertEqual(Notification.objects.count(), 1)
        record = Notification.objects.get()
        self.assertEqual(self.client.get(reverse("notifications-list")).data["unread_count"], 0)
        self.assertEqual(self.client.post(reverse("notification-read", args=[record.pk])).status_code, 404)
        self.client.force_authenticate(self.helper_user)
        self.assertEqual(self.client.get(reverse("notifications-list")).data["unread_count"], 1)
        self.assertEqual(self.client.post(reverse("notification-read", args=[record.pk])).status_code, 200)
        self.assertEqual(self.client.get(reverse("notifications-list")).data["unread_count"], 0)
        self.client.post(reverse("help-requests-detail", args=[interaction.pk]), {"status": "accepted", "version": 1}, format="json")
        self.assertEqual(Notification.objects.count(), 1)  # POST isn't a status update.
        self.client.patch(reverse("help-requests-detail", args=[interaction.pk]), {"status": "accepted", "version": 1}, format="json")
        self.assertEqual(Notification.objects.count(), 2)
        self.client.patch(reverse("help-requests-detail", args=[interaction.pk]), {"status": "accepted", "version": 2}, format="json")
        self.assertEqual(Notification.objects.count(), 2)

    def test_pagination_all_read_and_blocking(self):
        interaction = HelpRequest.objects.create(seeker=self.user, helper_profile=self.helper_profile, topic="Test", message="Help")
        Notification.objects.bulk_create([Notification(recipient=self.user, peer=self.helper_user, help_request=interaction, event_key=str(i), title="Update", kind="accepted") for i in range(25)])
        response = self.client.get(reverse("notifications-list"))
        self.assertEqual(response.data["count"], 25)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])
        self.client.post("/api/notifications/read-all/")
        self.assertEqual(self.client.get(reverse("notifications-list")).data["unread_count"], 0)
        BlockedUser.objects.create(blocker=self.helper_user, blocked_user=self.user)
        self.assertEqual(self.client.get(reverse("notifications-list")).data["count"], 0)

    def test_email_outage_does_not_undo_request_and_retries_are_idempotent(self):
        self.helper_profile.notification_email_enabled = True
        self.helper_profile.save()
        created = self.client.post(reverse("help-requests-list"), {"helper_profile": self.helper_profile.pk, "topic": "Retry", "message": "Help"}, format="json")
        self.assertEqual(created.status_code, 201)
        delivery = EmailDelivery.objects.get()
        with patch("common.notifications.django_rq.get_queue", side_effect=ConnectionError):
            self.assertEqual(enqueue_due_emails(), 1)
        self.assertEqual(HelpRequest.objects.count(), 1)
        with patch("common.notifications.send_mail", side_effect=TimeoutError):
            deliver_email(delivery.pk)
        delivery.refresh_from_db()
        self.assertEqual(delivery.attempts, 1)
        self.assertEqual(delivery.last_error, "TimeoutError")
        self.assertGreater(delivery.next_attempt_at, timezone.now())
        EmailDelivery.objects.filter(pk=delivery.pk).update(next_attempt_at=timezone.now()-timedelta(seconds=1))
        with patch("common.notifications.send_mail") as send:
            deliver_email(delivery.pk)
            deliver_email(delivery.pk)
            self.assertEqual(send.call_count, 1)
        delivery.refresh_from_db()
        self.assertIsNotNone(delivery.delivered_at)

    def test_email_consent_withdrawal_and_event_rollback(self):
        self.helper_profile.notification_email_enabled = True
        self.helper_profile.save()
        with patch("interactions.lifecycle.track_event", side_effect=RuntimeError("database failure")):
            with self.assertRaises(RuntimeError):
                self.client.post(reverse("help-requests-list"), {"helper_profile": self.helper_profile.pk, "topic": "Rollback", "message": "Help"}, format="json")
        self.assertEqual(Notification.objects.count(), 0)
        self.client.post(reverse("help-requests-list"), {"helper_profile": self.helper_profile.pk, "topic": "Consent", "message": "Help"}, format="json")
        self.helper_profile.notification_email_enabled = False
        self.helper_profile.save()
        with patch("common.notifications.send_mail") as send:
            deliver_email(EmailDelivery.objects.get().pk)
            send.assert_not_called()
