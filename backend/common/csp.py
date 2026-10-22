"""Content-Security-Policy settings. Imported by settings.py, so it must not import DRF."""
from django.utils.csp import CSP

GOOGLE_SIGN_IN = "https://accounts.google.com/gsi/"
API_EXPLORER_CDN = "https://cdn.jsdelivr.net"


def content_security_policy(google_sign_in=False, avatar_origin=""):
    """Everything from this site only. Google's sign-in origins and a hosted avatar store are added
    only when configured. React sets inline styles through the DOM, which CSP allows."""
    google = [GOOGLE_SIGN_IN] if google_sign_in else []
    return {
        "default-src": [CSP.SELF],
        "script-src": [CSP.SELF, *(f"{GOOGLE_SIGN_IN}client" for _ in google)],
        "style-src": [CSP.SELF, *(f"{GOOGLE_SIGN_IN}style" for _ in google)],
        "img-src": [CSP.SELF, "data:", "blob:", *([avatar_origin] if avatar_origin else [])],
        "font-src": [CSP.SELF],
        "connect-src": [CSP.SELF, *google],
        "frame-src": google or [CSP.NONE],
        "frame-ancestors": [CSP.NONE],
        "object-src": [CSP.NONE],
        "base-uri": [CSP.SELF],
        "form-action": [CSP.SELF],
    }


# The OpenAPI explorer pages load Swagger UI / ReDoc from a CDN with a small inline bootstrap script.
API_EXPLORER_POLICY = {
    "default-src": [CSP.SELF],
    "script-src": [CSP.SELF, CSP.UNSAFE_INLINE, API_EXPLORER_CDN],
    "style-src": [CSP.SELF, CSP.UNSAFE_INLINE, API_EXPLORER_CDN, "https://fonts.googleapis.com"],
    "font-src": [CSP.SELF, "https://fonts.gstatic.com"],
    "img-src": [CSP.SELF, "data:", API_EXPLORER_CDN],
    "worker-src": [CSP.SELF, "blob:"],
    "connect-src": [CSP.SELF],
    "frame-ancestors": [CSP.NONE],
    "object-src": [CSP.NONE],
}
