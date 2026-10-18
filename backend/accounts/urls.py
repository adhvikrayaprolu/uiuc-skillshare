from django.urls import path
from allauth.headless.account.views import ConfirmLoginCodeView
from allauth.headless.constants import Client
from .lifecycle import AccountDeleteView, AccountExportView
from .views import EmailCodeRequestView, EmailCodeResendView, GoogleAuthView, MeView, csrf, session_logout

urlpatterns = [
    path("export/", AccountExportView.as_view(), name="account-export"),
    path("delete/", AccountDeleteView.as_view(), name="account-delete"),
    path("csrf/", csrf, name="auth-csrf"),
    path("google/", GoogleAuthView.as_api_view(client=Client.BROWSER), name="google-auth"),
    path("email/request/", EmailCodeRequestView.as_api_view(client=Client.BROWSER), name="email-code-request"),
    path("email/confirm/", ConfirmLoginCodeView.as_api_view(client=Client.BROWSER), name="email-code-confirm"),
    path("email/resend/", EmailCodeResendView.as_api_view(client=Client.BROWSER), name="email-code-resend"),
    path("logout/", session_logout, name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
]
