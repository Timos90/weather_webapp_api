# tests/test_serializers.py
from django.test import TestCase
from django.contrib.auth.models import User
from apps.user.serializer import RegistrationSerializer, UserProfileSerializer
from apps.user.models import UserProfile

class RegistrationSerializerTest(TestCase):
    def test_valid_registration(self):
        data = {
            'username': 'newuser',
            'password': 'password123',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'location': 'Athens',
            'preferred_temperature_unit': 'C'
        }
        serializer = RegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        profile = serializer.save()
        self.assertEqual(profile.user.username, data['username'])
        self.assertEqual(profile.user.email, data['email'])

    def test_duplicate_username(self):
        User.objects.create_user(username='existing', password='password123', email='exist1@example.com')
        data = {
            'username': 'existing',
            'password': 'password123',
            'email': 'new@example.com',
            'location': 'Athens',
            'preferred_temperature_unit': 'C'
        }
        serializer = RegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("Username already taken.", serializer.errors['username'])

    def test_duplicate_email(self):
        User.objects.create_user(username='user1', password='password123', email='dup@example.com')
        data = {
            'username': 'user2',
            'password': 'password123',
            'email': 'dup@example.com',
            'location': 'Athens',
            'preferred_temperature_unit': 'C'
        }
        serializer = RegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("That email is already taken.", serializer.errors['email'])

class UserProfileSerializerTest(TestCase):
    def test_profile_serializer_output(self):
        user = User.objects.create_user(username='profileuser', password='password123', email='profile@example.com', first_name='Profile', last_name='User')
        profile = UserProfile.objects.create(user=user, location='Athens', preferred_temperature_unit='F')
        serializer = UserProfileSerializer(profile)
        data = serializer.data
        self.assertEqual(data['user']['username'], 'profileuser')
        self.assertEqual(data['user']['email'], 'profile@example.com')
        self.assertEqual(data['location'], 'Athens')
        self.assertEqual(data['preferred_temperature_unit'], 'F')
