from datetime import timedelta

from django.test import Client
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from common.models import Notification
from interactions.expiry import expire_pending, remind_pending
from interactions.models import HelpRequest, ModerationAudit, Report
from interactions.tests_inbox import RequestFixture


class PendingLimitTests(RequestFixture):
    def send(self, topic):
        payload = {"helper_profile": self.peer.pk, "topic": topic, "message": "Hi", "related_skill": self.figma.pk}
        return self.client.post(reverse("help-requests-list"), payload, format="json")

    def test_new_requests_expire_in_fourteen_days(self):
        self.send("Figma basics")
        expires = HelpRequest.objects.get().expires_at
        self.assertAlmostEqual((expires - timezone.now()).total_seconds(), timedelta(days=14).total_seconds(), delta=60)

    def test_at_most_five_requests_can_wait_for_a_reply(self):
        for index in range(5):
            self.assertEqual(self.send(f"Topic {index}").status_code, 201)
        response = self.send("One too many")
        self.assertEqual(response.status_code, 400)
        self.assertIn("5 requests waiting", str(response.data))
        HelpRequest.objects.filter(topic="Topic 0").update(status="declined")
        self.assertEqual(self.send("One too many").status_code, 201)


class ExpiryTests(RequestFixture):
    def aged(self, days, **fields):
        row = self.make(**fields)
        created = timezone.now() - timedelta(days=days)
        HelpRequest.objects.filter(pk=row.pk).update(created_at=created, expires_at=created + HelpRequest.PENDING_LIFETIME)
        row.refresh_from_db()
        return row

    def test_receiver_is_reminded_once_after_a_week(self):
        row = self.aged(8)
        self.assertEqual(remind_pending(), 1)
        self.assertEqual(remind_pending(), 0)
        row.refresh_from_db()
        self.assertIsNotNone(row.reminded_at)
        self.assertEqual(Notification.objects.get(recipient=self.peer_user, kind="reminder").title, "A swap proposal is waiting for your reply")
        self.assertEqual(self.aged(3, topic="Recent").reminded_at, None)
        self.assertEqual(remind_pending(), 0)

    def test_unanswered_requests_expire_and_both_sides_hear_about_it(self):
        row = self.aged(15)
        fresh = self.aged(2, topic="Fresh")
        self.assertEqual(expire_pending(), 1)
        row.refresh_from_db()
        fresh.refresh_from_db()
        self.assertEqual((row.status, row.version, fresh.status), ("expired", 2, "pending"))
        self.assertIsNotNone(row.expired_at)
        self.assertEqual(set(Notification.objects.filter(kind="expired").values_list("recipient", flat=True)), {self.me.pk, self.peer_user.pk})
        self.assertEqual(self.bucket(self.me, "past"), [row.pk])
        self.assertEqual(self.bucket(self.peer_user, "needs_action"), [fresh.pk])

    def test_expired_requests_cannot_be_accepted(self):
        row = self.aged(15)
        stale_version = row.version
        expire_pending()
        self.client.force_authenticate(self.peer_user)
        for version in (stale_version, stale_version + 1):
            response = self.client.patch(reverse("help-requests-detail", args=[row.pk]), {"version": version, "status": "accepted"}, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("expired", str(response.data))
        row.refresh_from_db()
        self.assertEqual(row.status, "expired")

    def test_requests_past_expiry_cannot_be_accepted_before_the_job_runs(self):
        row = self.aged(15)
        self.assertEqual(self.patch(row, self.peer_user, status="accepted").status_code, 400)
        self.assertEqual(self.patch(row, self.me, status="cancelled").status_code, 200)

    def test_accepted_requests_never_expire(self):
        row = self.aged(20, status="accepted")
        self.assertEqual(expire_pending(), 0)
        row.refresh_from_db()
        self.assertEqual(row.status, "accepted")


class ModerationAdminTests(RequestFixture):
    def test_staff_can_suspend_reported_members_from_the_report_queue(self):
        report = Report.objects.create(reporter=self.me, reported_profile=self.peer, reason="harassment", description="Rude messages")
        admin = User.objects.create_superuser("mod@illinois.edu", "pw-for-tests-only")
        browser = Client()
        browser.force_login(admin)
        response = browser.post(reverse("admin:interactions_report_changelist"), {"action": "suspend_reported_members", "_selected_action": [report.pk]})
        self.assertEqual(response.status_code, 302)
        self.peer_user.refresh_from_db()
        report.refresh_from_db()
        self.assertFalse(self.peer_user.is_active)
        self.assertEqual(report.status, "action_taken")
        self.assertTrue(ModerationAudit.objects.filter(actor=admin, subject=self.peer_user, action="suspended").exists())

    def test_suspension_closes_open_requests_but_keeps_history(self):
        pending, accepted, done = self.make(), self.make(status="accepted", topic="Second"), self.make(status="completed", topic="Third")
        from accounts.lifecycle import suspend_user
        self.assertTrue(suspend_user(None, self.peer_user))
        for row in (pending, accepted, done):
            row.refresh_from_db()
        self.assertEqual([pending.status, accepted.status, done.status], ["cancelled", "cancelled", "completed"])
        self.assertEqual(pending.cancel_reason, "This member is no longer available.")
        self.assertEqual(pending.version, 2)
        self.assertFalse(suspend_user(None, self.peer_user))

    def test_dismissing_a_report_is_audited(self):
        report = Report.objects.create(reporter=self.me, reported_profile=self.peer, reason="spam", description="Ads")
        admin = User.objects.create_superuser("mod@illinois.edu", "pw-for-tests-only")
        browser = Client()
        browser.force_login(admin)
        browser.post(reverse("admin:interactions_report_changelist"), {"action": "dismiss", "_selected_action": [report.pk]})
        report.refresh_from_db()
        self.assertEqual(report.status, "dismissed")
        self.assertTrue(self.peer_user.is_active)
        self.assertTrue(ModerationAudit.objects.filter(subject=self.peer_user, action="report_dismissed").exists())
