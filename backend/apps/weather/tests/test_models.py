# tests/test_models.py
from django.test import TestCase
from django.contrib.auth.models import User
from apps.weather.models.location import FavoriteLocation

class FavoriteLocationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass123')
        
    def test_favorite_location_creation(self):
        location = FavoriteLocation.objects.create(
            user=self.user,
            city_name='Paris',
            country_code='FRA',
            latitude=48.8566,
            longitude=2.3522
        )
        self.assertEqual(str(location), "Paris, FRA (User: testuser)")
        
    def test_unique_together_constraint(self):
        FavoriteLocation.objects.create(
            user=self.user,
            city_name='Paris',
            country_code='FRA'
        )
        with self.assertRaises(Exception):
            # Attempting to create a duplicate favorite location for the same user should fail.
            FavoriteLocation.objects.create(
                user=self.user,
                city_name='Paris',
                country_code='FRA'
            )

