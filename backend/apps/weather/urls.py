from django.urls import path
from . import views


app_name = 'weather-urls'
urlpatterns = [
        path('favorites/', views.FavoriteLocationView.as_view(), name='favorite-locations'),
        path('current/', views.CurrentWeatherView.as_view(), name='current-list'),
        path('forecast/', views.ForecastListView.as_view(), name='forecast-list'),
        path('alerts/', views.AlertsView.as_view(), name='alerts-view'),
        path('news/', views.NewsView.as_view(), name='news-view'),
      ]
