from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.http import Http404, HttpResponse
from whitenoise.middleware import WhiteNoiseMiddleware

PUBLIC_PAGES = ("", "login", "guidelines", "privacy", "terms")


@lru_cache(maxsize=4)
def rendered_index(file, mtime, public_url):
    # Social crawlers need absolute URLs, which are only known at deploy time.
    return file.read_text(encoding="utf-8").replace("__APP_PUBLIC_URL__", public_url)


def index(request, path=""):
    if path.split("/", 1)[0] in {"api", "admin", "media", "static", "_allauth"}:
        raise Http404
    file = Path(settings.WHITENOISE_ROOT) / "index.html"
    if not file.exists():
        raise Http404
    response = HttpResponse(rendered_index(file, file.stat().st_mtime, settings.APP_PUBLIC_URL), content_type="text/html; charset=utf-8")
    response["Cache-Control"] = "no-cache"
    if path.strip("/") not in PUBLIC_PAGES:
        response["X-Robots-Tag"] = "noindex"
    return response


def robots(request):
    lines = [
        "User-agent: *",
        *[f"Allow: /{page}" for page in PUBLIC_PAGES if page],
        "Disallow: /api/",
        "Disallow: /admin/",
        "Disallow: /_allauth/",
        "Disallow: /home",
        "Disallow: /discover",
        "Disallow: /profiles/",
        "Disallow: /requests",
        "Disallow: /me",
        "Disallow: /settings",
        "Disallow: /welcome",
        "Disallow: /analytics",
        f"Sitemap: {settings.APP_PUBLIC_URL}/sitemap.xml",
        "",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain; charset=utf-8")


def sitemap(request):
    urls = "".join(f"<url><loc>{settings.APP_PUBLIC_URL}/{page}</loc></url>" for page in PUBLIC_PAGES)
    body = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
    return HttpResponse(body, content_type="application/xml")


class SpaWhiteNoiseMiddleware(WhiteNoiseMiddleware):
    """Serve built assets, but leave the index template to the view that fills in APP_PUBLIC_URL."""

    def __call__(self, request):
        if request.path_info == "/index.html":
            return self.get_response(request)
        return super().__call__(request)
