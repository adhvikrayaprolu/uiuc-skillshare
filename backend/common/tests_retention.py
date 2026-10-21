from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from discovery.tests_swaps import SwapFixture
from interactions.models import BlockedUser, HelpRequest
from .models import EmailDelivery, Notification
from .notifications import deliver_email
from .retention import MAX_ALERT_RECIPIENTS, send_skill_alerts, send_weekly_digests


def ready(*users):
    User.objects.filter(pk__in=[user.pk for user in users]).update(has_completed_onboarding=True)


class SkillAlertTests(SwapFixture):
    def setUp(self):
        super().setUp()
        self.mine.alerts_sent_at = timezone.now()
        self.mine.save()
        self.teacher_user, self.teacher = self.member("teacher maya", teaches=[self.figma], goals=[self.guitar])
        ready(self.me, self.teacher_user)

    def alerts(self, user=None):
        return Notification.objects.filter(recipient=user or self.me, kind="skill_alert")

    def test_new_teacher_alerts_learners_once_and_links_to_the_profile(self):
        self.assertEqual(send_skill_alerts(), 1)
        alert = self.alerts().get()
        self.assertEqual(alert.title, "Teacher just joined and teaches Figma")
        self.assertEqual(alert.profile, self.teacher)
        self.assertIsNone(alert.help_request)
        listed = self.client.get(reverse("notifications-list")).data["results"][0]
        self.assertEqual(listed["href"], f"/profiles/{self.teacher.pk}")
        self.teacher.refresh_from_db()
        self.assertIsNotNone(self.teacher.alerts_sent_at)
        self.teacher.visibility = "private"
        self.teacher.save()
        self.teacher.visibility = "public"
        self.teacher.save()
        self.assertEqual(send_skill_alerts(), 0)
        self.assertEqual(self.alerts().count(), 1)

    def test_unfinished_hidden_or_closed_profiles_wait_until_they_are_live(self):
        User.objects.filter(pk=self.teacher_user.pk).update(has_completed_onboarding=False)
        self.assertEqual(send_skill_alerts(), 0)
        ready(self.teacher_user)
        self.teacher.visibility = "private"
        self.teacher.save()
        self.assertEqual(send_skill_alerts(), 0)
        self.teacher.visibility = "public"
        self.teacher.save()
        self.assertEqual(send_skill_alerts(), 1)

    def test_opted_out_blocked_and_unrelated_members_get_nothing(self):
        other_user, other = self.member("other", teaches=[], goals=[self.figma])
        blocked_user, _ = self.member("blocked", teaches=[], goals=[self.figma])
        unrelated_user, _ = self.member("unrelated", teaches=[], goals=[self.guitar])
        for record in (other, blocked_user.profile, unrelated_user.profile):
            record.alerts_sent_at = timezone.now()
            record.save()
        ready(other_user, blocked_user, unrelated_user)
        self.mine.skill_alerts_enabled = False
        self.mine.save()
        BlockedUser.objects.create(blocker=blocked_user, blocked_user=self.teacher_user)
        self.assertEqual(send_skill_alerts(), 1)
        self.assertEqual(list(Notification.objects.filter(kind="skill_alert").values_list("recipient", flat=True)), [other_user.pk])

    def test_alert_hidden_when_teacher_later_unpublishes(self):
        send_skill_alerts()
        self.assertEqual(self.client.get(reverse("notifications-list")).data["count"], 1)
        self.teacher.visibility = "private"
        self.teacher.save()
        self.assertEqual(self.client.get(reverse("notifications-list")).data["count"], 0)

    def test_alert_email_is_branded_and_respects_both_settings(self):
        self.mine.notification_email_enabled = True
        self.mine.save()
        send_skill_alerts()
        delivery = EmailDelivery.objects.get()
        with override_settings(APP_PUBLIC_URL="https://skillshare.example"):
            deliver_email(delivery.pk)
        message = mail.outbox[0]
        self.assertEqual(message.subject, "Teacher just joined and teaches Figma")
        self.assertIn(f"https://skillshare.example/profiles/{self.teacher.pk}", message.body)
        self.assertIn("Turn off skill alerts", message.body)
        html = message.alternatives[0][0]
        self.assertIn("Illini <span", html)
        self.assertIn("View profile", html)

    def test_alert_email_skipped_after_opting_out(self):
        self.mine.notification_email_enabled = True
        self.mine.save()
        send_skill_alerts()
        self.mine.skill_alerts_enabled = False
        self.mine.save()
        deliver_email(EmailDelivery.objects.get().pk)
        self.assertEqual(mail.outbox, [])
        self.assertIsNotNone(EmailDelivery.objects.get().delivered_at)

    def test_recipients_are_bounded(self):
        self.assertGreater(MAX_ALERT_RECIPIENTS, 1)
        with patch("common.retention.MAX_ALERT_RECIPIENTS", 1):
            self.member("second", teaches=[], goals=[self.figma])
            ready(User.objects.get(email="second@illinois.edu"))
            self.assertEqual(send_skill_alerts(), 1)

    def test_settings_round_trip_through_the_profile_api(self):
        response = self.client.patch(reverse("profile-me"), {"skill_alerts_enabled": False, "digest_email_enabled": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data["skill_alerts_enabled"])
        self.assertTrue(response.data["digest_email_enabled"])


class DigestTests(SwapFixture):
    def setUp(self):
        super().setUp()
        self.peer_user, self.peer = self.member("peer", teaches=[self.figma], goals=[self.python], public_goals=True)
        ready(self.me, self.peer_user)

    def test_digest_is_off_by_default(self):
        HelpRequest.objects.create(seeker=self.peer_user, helper_profile=self.mine, topic="Python help", message="Hi", related_skill=self.python)
        self.assertEqual(send_weekly_digests(), 0)
        self.assertEqual(mail.outbox, [])

    def test_weekly_digest_lists_waiting_requests_once_a_week(self):
        self.mine.digest_email_enabled = True
        self.mine.save()
        HelpRequest.objects.create(seeker=self.peer_user, helper_profile=self.mine, topic="Python help", message="Hi", related_skill=self.python)
        self.assertEqual(send_weekly_digests(), 1)
        message = mail.outbox[0]
        self.assertEqual(message.subject, "Your week on Illini SkillShare")
        self.assertIn("1 waiting on you", message.body)
        self.assertIn("- Python help", message.body)
        self.assertIn("Turn off the weekly digest", message.body)
        self.assertEqual(send_weekly_digests(), 0)
        self.assertEqual(send_weekly_digests(now=timezone.now() + timedelta(days=7, minutes=1)), 1)

    def test_nothing_to_report_sends_nothing(self):
        self.mine.digest_email_enabled = True
        self.mine.save()
        self.assertEqual(send_weekly_digests(), 0)
        self.assertEqual(mail.outbox, [])
        self.mine.refresh_from_db()
        self.assertIsNotNone(self.mine.last_digest_at)

    def test_mail_failure_is_not_retried_the_same_week(self):
        self.mine.digest_email_enabled = True
        self.mine.save()
        HelpRequest.objects.create(seeker=self.peer_user, helper_profile=self.mine, topic="Python help", message="Hi", related_skill=self.python)
        with patch("common.retention.send_branded", side_effect=TimeoutError):
            self.assertEqual(send_weekly_digests(), 0)
        self.assertEqual(send_weekly_digests(), 0)

    def test_blocked_peers_are_left_out(self):
        self.mine.digest_email_enabled = True
        self.mine.save()
        HelpRequest.objects.create(seeker=self.peer_user, helper_profile=self.mine, topic="Python help", message="Hi", related_skill=self.python)
        BlockedUser.objects.create(blocker=self.me, blocked_user=self.peer_user)
        self.assertEqual(send_weekly_digests(), 0)


class CommunityTests(SwapFixture):
    def test_popular_unmet_and_untaught_goals(self):
        self.member("a", teaches=[self.figma], goals=[self.guitar], public_goals=True)
        self.member("b", teaches=[self.figma], goals=[self.guitar], public_goals=False)
        self.member("hidden", teaches=[self.guitar], goals=[], visibility="private")
        data = self.client.get(reverse("discovery-community")).data
        self.assertEqual(data["member_count"], 2)
        self.assertEqual(data["popular"], [{"id": self.figma.pk, "name": "Figma", "teachers": 2}])
        self.assertEqual(data["unmet"], [{"id": self.guitar.pk, "name": "Guitar", "learners": 1}])
        self.assertEqual(data["my_untaught_goals"], [])
        self.mine.learning_goals.set([self.guitar])
        self.assertEqual(self.client.get(reverse("discovery-community")).data["my_untaught_goals"], [{"id": self.guitar.pk, "name": "Guitar"}])

    def test_requires_sign_in(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(reverse("discovery-community")).status_code, {401, 403})


class SignInEmailTests(SwapFixture):
    def test_login_code_email_is_branded_with_code_on_its_own_line(self):
        from django.template.loader import render_to_string
        text = render_to_string("account/email/login_code_message.txt", {"code": "ABCD-EFGH"})
        self.assertIn("\nABCD-EFGH\n", text)
        self.assertIn("Illini SkillShare", text)
        html = render_to_string("account/email/login_code_message.html", {"code": "ABCD-EFGH", "settings_url": "x"})
        self.assertIn("ABCD-EFGH", html)
        self.assertEqual(render_to_string("account/email/login_code_subject.txt").strip(), "Your Illini SkillShare sign-in code")
