# tests/test_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile
from rest_framework.authtoken.models import Token

class UserRegistrationTest(APITestCase):
    def test_registration_success(self):
        url = reverse('user-urls:register')
        data = {
            'username': 'newuser',
            'password': 'password123',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'location': 'Athens',
            'preferred_temperature_unit': 'C'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
    
    def test_registration_duplicate_username(self):
        User.objects.create_user(username='existing', password='password123', email='exist1@example.com')
        url = reverse('user-urls:register')
        data = {
            'username': 'existing',
            'password': 'password123',
            'email': 'new@example.com',
            'location': 'Athens',
            'preferred_temperature_unit': 'C'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Username already taken.", response.data.get('username', []))
    
    def test_registration_duplicate_email(self):
        User.objects.create_user(username='user1', password='password123', email='dup@example.com')
        url = reverse('user-urls:register')
        data = {
            'username': 'user2',
            'password': 'password123',
            'email': 'dup@example.com',
            'location': 'Athens',
            'preferred_temperature_unit': 'C'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("That email is already taken.", response.data.get('email', []))

class LoginLogoutTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='loginuser', password='password123', email='login@example.com')
    
    def test_login_success(self):
        url = reverse('user-urls:login')
        data = {'username': 'loginuser', 'password': 'password123'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
    
    def test_login_invalid_credentials(self):
        url = reverse('user-urls:login')
        data = {'username': 'loginuser', 'password': 'wrongpassword'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout(self):
        url_login = reverse('user-urls:login')
        data = {'username': 'loginuser', 'password': 'password123'}
        response = self.client.post(url_login, data, format='json')
        token = response.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        
        url_logout = reverse('user-urls:logout')
        response = self.client.post(url_logout, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Successfully logged out.')

class UserProfileTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='profileuser', password='password123', email='profile@example.com')
        self.profile = UserProfile.objects.create(user=self.user, location='Athens', preferred_temperature_unit='C')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_get_profile(self):
        url = reverse('user-urls:profile')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'profileuser')
    
    def test_update_profile_duplicate_username(self):
        User.objects.create_user(username='existinguser', password='password123', email='exist@example.com')
        url = reverse('user-urls:profile')
        data = {
            'username': 'existinguser',  # duplicate
            'email': 'profile@example.com',
            'location': 'Athens',
            'preferred_temperature_unit': 'C',
            'first_name': 'Profile',
            'last_name': 'User'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'That username is already in use.')
    
    def test_update_profile_duplicate_email(self):
        User.objects.create_user(username='anotheruser', password='password123', email='duplicate@example.com')
        url = reverse('user-urls:profile')
        data = {
            'username': 'profileuser',
            'email': 'duplicate@example.com',  # duplicate
            'location': 'Athens',
            'preferred_temperature_unit': 'C',
            'first_name': 'Profile',
            'last_name': 'User'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'That email is already in use.')

class DeleteAccountTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='deluser', password='password123', email='del@example.com')
        self.profile = UserProfile.objects.create(user=self.user, location='Athens', preferred_temperature_unit='C')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_delete_account_with_wrong_email(self):
        url = reverse('user-urls:delete-account')
        data = {'email': 'wrong@example.com'}
        response = self.client.delete(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Provided email does not match your account email.')
    
    def test_delete_account_success(self):
        url = reverse('user-urls:delete-account')
        data = {'email': 'del@example.com'}
        response = self.client.delete(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Account deleted successfully.')
        with self.assertRaises(User.DoesNotExist):
            User.objects.get(username='deluser')
