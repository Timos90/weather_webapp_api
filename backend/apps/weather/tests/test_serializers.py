# tests/test_serializers.py
from django.test import TestCase

from apps.weather.serializers.location import FavoriteLocationSerializer
from apps.weather.serializers.alerts import AlertSerializer

from apps.weather.serializers.forecast import ForecastSerializer
from apps.weather.serializers.news import NewsSerializer
from datetime import datetime, timedelta

# Test FavoriteLocationSerializer
class FavoriteLocationSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            'city_name': 'London',
            'country_code': 'GBR',
            'latitude': 51.5074,
            'longitude': -0.1278,
        }
        self.invalid_data = {
            'city_name': 'London',
            'country_code': 'GBR',
            'latitude': 200,  # outside valid range
            'longitude': -0.1278,
        }
    
    def test_valid_serializer(self):
        serializer = FavoriteLocationSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_invalid_latitude(self):
        serializer = FavoriteLocationSerializer(data=self.invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('latitude', serializer.errors)


# Test AlertSerializer
class AlertSerializerTest(TestCase):
    def setUp(self):
        self.now = datetime.now()
        self.valid_data = {
            'headline': 'Storm Warning',
            'msgtype': 'Alert',
            'urgency': 'Immediate',
            'event': 'Storm',
            'effective': self.now.isoformat(),
            'desc': 'Heavy storm expected in the area.',
            'expires': (self.now + timedelta(hours=2)).isoformat(),
        }
        self.invalid_data = self.valid_data.copy()
        # Set expires before effective
        self.invalid_data['expires'] = (self.now - timedelta(hours=1)).isoformat()
    
    def test_valid_alert_serializer(self):
        serializer = AlertSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_invalid_alert_serializer(self):
        serializer = AlertSerializer(data=self.invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('time_validation', serializer.errors)


# Test ForecastSerializer
class ForecastSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            'location': 'TestLocation',
            'timestamp': datetime.now().isoformat(),
            'temperature': 20.0,
            'max_temperature': 25.0,
            'min_temperature': 15.0,
            'humidity': 60,
            'weather_description': 'Clear sky'
        }
        self.invalid_data = self.valid_data.copy()
        # max_temperature less than min_temperature should trigger error
        self.invalid_data['max_temperature'] = 10.0
    
    def test_valid_forecast_serializer(self):
        serializer = ForecastSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_invalid_forecast_serializer(self):
        serializer = ForecastSerializer(data=self.invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


# Test NewsSerializer
class NewsSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            'title': 'Weather News',
            'url': 'http://example.com/news',
            'publishedAt': datetime.now().isoformat(),
            'content': 'Content of the news article',
            'urlToImage': 'http://example.com/image.jpg'
        }
    
    def test_valid_news_serializer(self):
        serializer = NewsSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
