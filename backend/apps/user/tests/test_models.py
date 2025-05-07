# tests/test_models.py
from django.test import TestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile

class UserProfileModelTest(TestCase):
    def test_str_method(self):
        user = User.objects.create_user(username='testuser', password='password123')
        profile = UserProfile.objects.create(user=user, location='Athens', preferred_temperature_unit='C')
        self.assertEqual(str(profile), "testuser's profile")
