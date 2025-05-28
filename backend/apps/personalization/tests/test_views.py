# backend/apps/personalization/tests/test_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile
from rest_framework.authtoken.models import Token
from apps.personalization.models import OutfitFeedback

class OutfitFeedbackViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # User 1 and their profile/token
        cls.user1 = User.objects.create_user(username='feedbackuser1', password='password123', email='user1@example.com')
        cls.user_profile1 = UserProfile.objects.create(user=cls.user1, location='City A', gender='Man')
        cls.token1 = Token.objects.create(user=cls.user1)

        # User 2 and their profile/token
        cls.user2 = User.objects.create_user(username='feedbackuser2', password='password123', email='user2@example.com')
        cls.user_profile2 = UserProfile.objects.create(user=cls.user2, location='City B', gender='Woman')
        cls.token2 = Token.objects.create(user=cls.user2)

        cls.feedback_url = reverse('personalization-urls:outfit-feedback')

        cls.weather_data_sample1 = {
            "datetime": "2025-06-01T12:00:00Z",
            "temperature": 25,
            "feelsLike": 26,
            "weatherMain": "Clear"
        }
        cls.suggested_outfit_sample1 = {
            "items": ["t_shirt", "shorts"],
            "advice": ["Sunny day!"]
        }

    def test_create_feedback_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OutfitFeedback.objects.count(), 1)
        feedback_entry = OutfitFeedback.objects.first()
        self.assertEqual(feedback_entry.user_profile, self.user_profile1)
        self.assertEqual(feedback_entry.feedback_type, 'like')
        self.assertEqual(feedback_entry.user_gender_at_feedback, 'Man')
        self.assertEqual(feedback_entry.weather_data['datetime'], "2025-06-01T12:00:00Z")

    def test_create_feedback_unauthenticated(self):
        # No self.client.credentials()
        payload = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': 'Male'
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_feedback_duplicate_for_same_user_and_time(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload = {
            'weather_data': self.weather_data_sample1, # Same weather_data datetime
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        # First submission
        response1 = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OutfitFeedback.objects.count(), 1)

        # Second submission (duplicate)
        payload['feedback_type'] = 'dislike' # Change something else, but datetime is key
        response2 = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('feedback already submitted for this weather time slot.', response2.data.get('detail', '').lower())
        self.assertEqual(OutfitFeedback.objects.count(), 1) # Should still be 1

    def test_create_feedback_different_user_same_time_allowed(self):
        # User 1 submits feedback
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload_user1 = {
            'weather_data': self.weather_data_sample1, # Same weather_data datetime
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        response1 = self.client.post(self.feedback_url, payload_user1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # User 2 submits feedback for the same time slot
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        payload_user2 = {
            'weather_data': self.weather_data_sample1, # Same weather_data datetime
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'dislike',
            'user_gender_at_feedback': self.user_profile2.gender
        }
        response2 = self.client.post(self.feedback_url, payload_user2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OutfitFeedback.objects.count(), 2) # Now 2 entries

    def test_create_feedback_missing_weather_data(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload = {
            # 'weather_data': self.weather_data_sample1, # Missing
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('weather_data', response.data)

    def test_create_feedback_invalid_feedback_type(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'maybe', # Invalid choice
            'user_gender_at_feedback': self.user_profile1.gender
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('feedback_type', response.data)

    def test_create_feedback_user_gender_at_feedback_optional(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            # 'user_gender_at_feedback': self.user_profile1.gender, # Missing, but optional
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(user_profile=self.user_profile1, weather_data__datetime=self.weather_data_sample1['datetime'])
        self.assertIsNone(feedback_entry.user_gender_at_feedback) # Model field allows null
