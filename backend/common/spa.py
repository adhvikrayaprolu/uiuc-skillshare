from django.conf import settings
from django.http import FileResponse, Http404


def index(request, path=""):
    if path.split("/", 1)[0] in {"api", "admin", "media", "static", "_allauth"}:
        raise Http404
    file = settings.BASE_DIR / "frontend_dist" / "index.html"
    if not file.exists():
        raise Http404
    response = FileResponse(file.open("rb"), content_type="text/html")
    response["Cache-Control"] = "no-cache"
    return response
