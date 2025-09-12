from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)


urlpatterns = [
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path("admin/", admin.site.urls),
    path("api/v1/weather/", include('apps.weather.urls', namespace='weather-urls')),
    path("api/v1/user/", include('apps.user.urls', namespace='user-urls')),
    path("api/v1/personalization/", include('apps.personalization.urls', namespace='personalization-urls')),
    path("", include('apps.main.urls')),
]
