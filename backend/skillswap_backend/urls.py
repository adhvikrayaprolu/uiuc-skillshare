from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from common.spa import index, robots, sitemap
from django.views.decorators.csp import csp_override
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from common.csp import API_EXPLORER_POLICY


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", csp_override(API_EXPLORER_POLICY)(SpectacularSwaggerView.as_view(url_name="schema")), name="swagger-ui"),
    path("api/redoc/", csp_override(API_EXPLORER_POLICY)(SpectacularRedocView.as_view(url_name="schema")), name="redoc"),
    path("api/", include("common.urls")),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("profiles.urls")),
    path("api/", include("taxonomy.urls")),
    path("api/discovery/", include("discovery.urls")),
    path("api/", include("interactions.urls")),
]



urlpatterns += [
    path("robots.txt", robots, name="robots"),
    path("sitemap.xml", sitemap, name="sitemap"),
    re_path(r"^(?P<path>.*)$", index, name="frontend"),
]
