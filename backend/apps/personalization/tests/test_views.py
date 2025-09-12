# backend/apps/personalization/tests/test_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile
from rest_framework_simplejwt.tokens import RefreshToken
from apps.personalization.models import OutfitFeedback
from unittest.mock import patch

class OutfitFeedbackViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # User 1 and their profile/token
        cls.user1 = User.objects.create_user(username='feedbackuser1', password='password123', email='user1@example.com')
        cls.user_profile1 = UserProfile.objects.create(user=cls.user1, location='City A', gender='Man')
        cls.token1 = RefreshToken.for_user(cls.user1)

        # User 2 and their profile/token
        cls.user2 = User.objects.create_user(username='feedbackuser2', password='password123', email='user2@example.com')
        cls.user_profile2 = UserProfile.objects.create(user=cls.user2, location='City B', gender='Woman')
        cls.token2 = RefreshToken.for_user(cls.user2)

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

        cls.weather_data_with_alerts = {
            "datetime": "2025-06-05T10:00:00Z",
            "temperature": 22,
            "feelsLike": 21,
            "weatherMain": "Cloudy",
            "unit": "C",
            "alerts": [
                {"event": "Wind Advisory", "description": "Strong winds expected."},
                {"event": "Pollen Alert", "description": "High pollen count."}
            ]
        }

    def test_create_feedback_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
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
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        payload = {
            'weather_data': self.weather_data_sample1, # Same weather_data datetime
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        # First submission
        response1 = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Second submission (duplicate)
        response2 = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(OutfitFeedback.objects.count(), 1)

    def test_create_feedback_different_user_same_time_allowed(self):
        # User 1 submits feedback
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        payload1 = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        response1 = self.client.post(self.feedback_url, payload1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # User 2 submits feedback for the same time
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token2.access_token)}')
        payload2 = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'dislike',
            'user_gender_at_feedback': self.user_profile2.gender
        }
        response2 = self.client.post(self.feedback_url, payload2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OutfitFeedback.objects.count(), 2)

    def test_create_feedback_missing_weather_data(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        payload = {
            # 'weather_data': self.weather_data_sample1, # Missing
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_feedback_invalid_feedback_type(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        payload = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'invalid_type',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_feedback_user_gender_at_feedback_optional(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        payload = {
            'weather_data': self.weather_data_sample1,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            # 'user_gender_at_feedback' is missing
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback = OutfitFeedback.objects.first()
        self.assertIsNone(feedback.user_gender_at_feedback)

    def test_create_feedback_with_fahrenheit_conversion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        weather_data_f = {
            "datetime": "2025-06-03T12:00:00Z",
            "temperature": 50,  # 10°C
            "feelsLike": 59,    # 15°C
            "weatherMain": "Clear",
            "unit": "F"
        }
        payload = {
            'weather_data': weather_data_f,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(weather_data__datetime="2025-06-03T12:00:00Z")
        self.assertEqual(feedback_entry.weather_data['temperature'], 10)
        self.assertEqual(feedback_entry.weather_data['feels_like'], 15)
        self.assertNotIn('unit', feedback_entry.weather_data)

    def test_create_feedback_with_celsius_no_conversion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        weather_data_c = {
            "datetime": "2025-06-04T12:00:00Z",
            "temperature": 18,
            "feelsLike": 17,
            "weatherMain": "Rain",
            "unit": "C"
        }
        payload = {
            'weather_data': weather_data_c,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'dislike',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(weather_data__datetime="2025-06-04T12:00:00Z")
        self.assertEqual(feedback_entry.weather_data['temperature'], 18)
        self.assertEqual(feedback_entry.weather_data['feels_like'], 17)
        self.assertNotIn('unit', feedback_entry.weather_data)

    def test_create_feedback_with_alerts_storage(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        payload = {
            'weather_data': self.weather_data_with_alerts,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(weather_data__datetime="2025-06-05T10:00:00Z")
        
        self.assertIn('alerts', feedback_entry.weather_data)
        self.assertIsInstance(feedback_entry.weather_data['alerts'], list)
        self.assertEqual(len(feedback_entry.weather_data['alerts']), 2)
        
        alert_events = {alert['event'] for alert in feedback_entry.weather_data['alerts']}
        self.assertIn('Wind Advisory', alert_events)
        self.assertIn('Pollen Alert', alert_events)

    def test_create_feedback_with_no_unit_assumes_celsius(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token1.access_token)}')
        weather_data_no_unit = {
            "datetime": "2025-06-04T12:00:00Z",
            "temperature": 15,
            "feelsLike": 14,
            "weatherMain": "Rain",
        }
        payload = {
            'weather_data': weather_data_no_unit,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(weather_data__datetime="2025-06-04T12:00:00Z")
        self.assertEqual(feedback_entry.weather_data['temperature'], 15)
        self.assertEqual(feedback_entry.weather_data['feels_like'], 14)
        self.assertNotIn('unit', feedback_entry.weather_data)

class OutfitSuggestionViewTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testuser', password='password123')
        cls.user_profile = UserProfile.objects.create(user=cls.user, gender='Man')
        cls.token = RefreshToken.for_user(cls.user)
        cls.suggest_url = reverse('personalization-urls:suggest-outfit')

    def setUp(self):
        # This setup runs before each test. We are testing an unauthenticated endpoint here primarily,
        # so we don't set credentials by default. Tests requiring auth will set it.
        pass

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_success(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['t_shirt', 'shorts'], ['Sunny day!'])
        payload = {
            'feels_like': 25,
            'temperature': 28,
            'user_gender': 'Man',
            'datetime': '2023-01-01T12:00:00Z',
            'weather_main': 'Clear',
            'precipitation_chance': 0
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('t_shirt', response.data['suggested_items'])
        self.assertIn('Sunny day!', response.data['advice_strings'])
        mock_suggest_outfit_py.assert_called_once()

    def test_get_suggestion_missing_required_field(self):
        payload = {'temperature': 28, 'datetime': '2023-01-01T12:00:00Z', 'weather_main': 'Clear'} # Missing 'feels_like'
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('feels_like', response.data)

    def test_get_suggestion_invalid_gender(self):
        payload = {'feels_like': 25, 'temperature': 28, 'user_gender': 'InvalidGender', 'datetime': '2023-01-01T12:00:00Z', 'weather_main': 'Clear'}
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('user_gender', response.data)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_optional_fields_not_provided(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['t_shirt'], ['Default advice'])
        payload = {
            'feels_like': 22,
            'temperature': 24,
            'datetime': '2023-01-01T12:00:00Z',
            'weather_main': 'Clouds'
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('t_shirt', response.data['suggested_items'])
        mock_suggest_outfit_py.assert_called_once()

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_with_fahrenheit_conversion(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['test_item'], ['test_advice'])
        payload = {
            'feels_like': 32,  # 0°C
            'temperature': 23, # -5°C
            'unit': 'F',
            'datetime': '2023-01-01T12:00:00Z',
            'weather_main': 'Clear',
            'precipitation_chance': 10
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        
        kwargs_passed = mock_suggest_outfit_py.call_args.kwargs
        weather_data_arg = kwargs_passed.get('weather_data')
        self.assertAlmostEqual(weather_data_arg['feels_like'], 0, places=2)
        self.assertAlmostEqual(weather_data_arg['temperature'], -5, places=2)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_with_explicit_celsius_unit(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['test_item'], ['test_advice'])
        payload = {
            'feels_like': 10,
            'temperature': 8,
            'unit': 'C',
            'datetime': '2023-01-01T12:00:00Z',
            'weather_main': 'Clouds',
            'precipitation_chance': 20
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        
        kwargs_passed = mock_suggest_outfit_py.call_args.kwargs
        weather_data_arg = kwargs_passed.get('weather_data')
        self.assertEqual(weather_data_arg['feels_like'], 10)
        self.assertEqual(weather_data_arg['temperature'], 8)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_with_no_unit_assumes_celsius(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['test_item'], ['test_advice'])
        payload = {
            'feels_like': 15,
            'temperature': 14,
            'datetime': '2023-01-01T12:00:00Z',
            'weather_main': 'Rain',
            'precipitation_chance': 60
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        
        kwargs_passed = mock_suggest_outfit_py.call_args.kwargs
        weather_data_arg = kwargs_passed.get('weather_data')
        self.assertEqual(weather_data_arg['feels_like'], 15)
        self.assertEqual(weather_data_arg['temperature'], 14)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_authenticated_user_profile_passed(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['auth_item'], ['auth_advice'])
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(self.token.access_token)}')

        payload = {
            'feels_like': 22,
            'temperature': 22,
            'user_gender': 'Woman',
            'datetime': '2023-01-01T12:00:00Z',
            'weather_main': 'Clear',
            'precipitation_chance': 5
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        
        kwargs_passed = mock_suggest_outfit_py.call_args.kwargs
        user_id_arg = kwargs_passed.get('user_id')
        self.assertEqual(user_id_arg, self.user.id)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_authenticated_user_no_profile_graceful_handling(self, mock_suggest_outfit_py):
        temp_user_no_profile = User.objects.create_user(username='nouserprofile', password='password123')
        temp_token_no_profile = RefreshToken.for_user(temp_user_no_profile)

        mock_suggest_outfit_py.return_value = (['no_profile_item'], ['no_profile_advice'])
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(temp_token_no_profile.access_token)}')

        payload = {
            'feels_like': 20,
            'temperature': 20,
            'user_gender': 'Man',
            'datetime': '2023-07-15T18:00:00Z',
            'weather_main': 'Clouds',
            'precipitation_chance': 15
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        
        kwargs_passed = mock_suggest_outfit_py.call_args.kwargs
        user_id_arg = kwargs_passed.get('user_id')
        self.assertIsNone(user_id_arg)

        temp_user_no_profile.delete()