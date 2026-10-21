"""Branded multipart (plain text + HTML) email."""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def email_context(context):
    base = settings.APP_PUBLIC_URL.rstrip("/")
    return {"app_url": base, "settings_url": f"{base}/settings", **context}


def send_branded(subject, to, template, context):
    context = email_context(context)
    text = render_to_string(f"email/{template}.txt", context)
    html = render_to_string(f"email/{template}.html", context)
    message = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to])
    message.attach_alternative(html, "text/html")
    message.send(fail_silently=False)


NOTIFICATION_COPY = {
    "created": ("You have a new request. Reply within 14 days or it expires.", "Reply"),
    "reminder": ("This request has been waiting a week. It expires if nobody replies within 14 days of sending.", "Reply"),
    "accepted": ("Your request was accepted. Their contact details are on the request page.", "Open request"),
    "declined": ("Your request was declined. Try someone else who teaches the same skill.", "Open request"),
    "completed": ("This request was marked complete. Leave feedback while it's fresh.", "Leave feedback"),
    "cancelled": ("This request was cancelled.", "Open request"),
    "expired": ("This request expired without a reply.", "Open request"),
    "reviewed": ("You received new feedback.", "Open request"),
    "skill_alert": ("Someone new teaches a skill you want to learn.", "View profile"),
}


def notification_copy(notification):
    kind = "reviewed" if notification.kind.startswith("endorsed-") else notification.kind
    return NOTIFICATION_COPY.get(kind, ("You have an update.", "Open Illini SkillShare"))


def send_notification_email(notification):
    line, action = notification_copy(notification)
    send_branded(notification.title, notification.recipient.email, "notification", {
        "title": notification.title, "line": line, "action": action,
        "action_url": f"{settings.APP_PUBLIC_URL.rstrip('/')}{notification.href}",
        "is_alert": notification.kind == "skill_alert",
    })
