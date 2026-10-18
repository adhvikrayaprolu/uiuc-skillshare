from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed


class MemberSessionAuthentication(SessionAuthentication):
    def authenticate_header(self, request):
        return "Session"

    def authenticate(self, request):
        result = super().authenticate(request)
        if result:
            user, _ = result
            if not user.is_active or user.is_demo or not user.is_student_verified:
                raise AuthenticationFailed("Verify an active Illinois account to continue.")
            if not user.is_staff and user.email.rpartition("@")[2].lower() != "illinois.edu":
                raise AuthenticationFailed("Illinois email access is required.")
        return result


from drf_spectacular.extensions import OpenApiAuthenticationExtension


class MemberSessionScheme(OpenApiAuthenticationExtension):
    target_class = 'accounts.authentication.MemberSessionAuthentication'
    name = 'memberSession'

    def get_security_definition(self, auto_schema):
        return {'type': 'apiKey', 'in': 'cookie', 'name': 'sessionid',
                'description': 'Verified member session. Unsafe methods also require X-CSRFToken.'}
