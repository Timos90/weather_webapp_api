from django.contrib import admin
from django.urls import path, include


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/weather/", include('apps.weather.urls', namespace='weather-urls')),
    path("api/v1/user/", include('apps.user.urls', namespace='user-urls')),
    path("", include('apps.main.urls')),
]
