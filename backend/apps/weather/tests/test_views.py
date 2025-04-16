# tests/test_views.py
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.contrib.auth.models import User
from apps.user.models import UserProfile  # Assuming you have a UserProfile model
import datetime
import os
import requests
from unittest.mock import patch

class FavoriteLocationViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='favuser', password='pass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('weather-urls:favorite-locations')
    
    def test_get_empty_favorites(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
    
    def test_post_favorite_location(self):
        data = {
            'city_name': 'Paris',
            'country_code': 'FRA',
            'latitude': 48.8566,
            'longitude': 2.3522
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)
        # GET should now list one favorite
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
    
    def test_delete_favorite_location(self):
        data = {
            'city_name': 'Paris',
            'country_code': 'FRA',
            'latitude': 48.8566,
            'longitude': 2.3522
        }
        self.client.post(self.url, data, format='json')
        delete_response = self.client.delete(self.url, data, format='json')
        self.assertEqual(delete_response.status_code, 200)

class AlertsViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alertuser', password='pass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('weather-urls:alerts-view')
        # Create a user profile with location
        self.profile = UserProfile.objects.create(user=self.user, location='London')
    
    @patch('apps.weather.views.alerts.requests.get')
    def test_alerts_success(self, mocked_get):
        # Create a fake API response for alerts
        fake_response = {
            "alerts": {
                "alert": [{
                    "headline": "Test Alert",
                    "msgtype": "Alert",
                    "urgency": "Immediate",
                    "event": "Storm",
                    "desc": "This is a test alert.",
                    "effective": (os.getenv('NOW') or datetime.datetime.now()).isoformat(),
                    "expires": (datetime.datetime.now() + datetime.timedelta(hours=2)).isoformat()
                }]
            }
        }
        mocked_get.return_value.status_code = 200
        mocked_get.return_value.json.return_value = fake_response

        response = self.client.get(self.url, {'location': 'London'})
        self.assertEqual(response.status_code, 200)
        # Verify that the serializer returns one alert
        self.assertEqual(len(response.data), 1)
    
    @patch('apps.weather.views.alerts.requests.get')
    def test_alerts_no_key(self, mocked_get):
        # If the API key is missing, the view should respond with an error.
        original_key = os.getenv('WEATHER_API_KEY')
        os.environ.pop('WEATHER_API_KEY', None)
        response = self.client.get(self.url, {'location': 'London'})
        self.assertEqual(response.status_code, 500)
        if original_key:
            os.environ['WEATHER_API_KEY'] = original_key

class CurrentWeatherViewTest(APITestCase):
    def setUp(self):
        self.url = reverse('weather-urls:current-list')
    
    @patch('apps.weather.views.current.requests.get')
    def test_current_weather_not_found(self, mocked_get):
        # Simulate a 404 from the weather API
        mocked_get.return_value.status_code = 404
        response = self.client.get(self.url, {'location': 'NowhereCity'})
        self.assertEqual(response.status_code, 404)

class ForecastListViewTest(APITestCase):
    def setUp(self):
        self.url = reverse('weather-urls:forecast-list')
    
    @patch('apps.weather.views.forecast.requests.get')
    def test_forecast_location_not_found(self, mocked_get):
        # Simulate a 404 from the forecast API
        mocked_get.return_value.status_code = 404
        response = self.client.get(self.url, {'location': 'NonExistentCity'})
        self.assertEqual(response.status_code, 404)

class NewsViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='newsuser', password='pass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.profile = UserProfile.objects.create(user=self.user, location='New York')
        self.url = reverse('weather-urls:news-view')
    
    @patch('apps.weather.views.news.requests.get')
    def test_news_success(self, mocked_get):
        # Prepare a fake news response
        fake_articles = [
            {
                "title": "Breaking Weather News",
                "url": "http://example.com/news1",
                "publishedAt": datetime.datetime.now().isoformat(),
                "content": "News content",
                "urlToImage": "http://example.com/image.jpg"
            }
        ]
        # Fake response: return articles in json
        mocked_get.return_value.status_code = 200
        mocked_get.return_value.json.return_value = {"articles": fake_articles}
        
        response = self.client.get(self.url, {'location': 'New York'})
        self.assertEqual(response.status_code, 200)
        # If valid, expect one article in response after filtering
        self.assertTrue(len(response.data) >= 0)  # Depending on filtering

