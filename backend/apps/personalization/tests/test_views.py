# backend/apps/personalization/tests/test_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile
from rest_framework.authtoken.models import Token
from apps.personalization.models import OutfitFeedback
from unittest.mock import patch

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

    def test_create_feedback_with_fahrenheit_conversion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        weather_data_fahrenheit = {
            "datetime": "2025-06-02T12:00:00Z",
            "temperature": 32,  # 0°C
            "feels_like": 23, # -5°C
            "weather_main": "Snow",
            "unit": "F"
        }
        payload = {
            'weather_data': weather_data_fahrenheit,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'dislike',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(weather_data__datetime="2025-06-02T12:00:00Z")
        self.assertAlmostEqual(feedback_entry.weather_data['temperature'], 0, places=2)
        self.assertAlmostEqual(feedback_entry.weather_data['feels_like'], -5, places=2)
        self.assertNotIn('unit', feedback_entry.weather_data) # Unit should be removed after conversion

    def test_create_feedback_with_celsius_no_conversion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        weather_data_celsius = {
            "datetime": "2025-06-03T12:00:00Z",
            "temperature": 10,
            "feels_like": 8,
            "weather_main": "Clouds",
            "unit": "C"
        }
        payload = {
            'weather_data': weather_data_celsius,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback_entry = OutfitFeedback.objects.get(weather_data__datetime="2025-06-03T12:00:00Z")
        self.assertEqual(feedback_entry.weather_data['temperature'], 10)
        self.assertEqual(feedback_entry.weather_data['feels_like'], 8)
        self.assertNotIn('unit', feedback_entry.weather_data)

    def test_create_feedback_with_alerts_storage(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        # Ensure a clean slate for count assertion if tests run in different orders
        OutfitFeedback.objects.all().delete()

        payload = {
            'weather_data': self.weather_data_with_alerts,
            'suggested_outfit': self.suggested_outfit_sample1,
            'feedback_type': 'like',
            'user_gender_at_feedback': self.user_profile1.gender
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(OutfitFeedback.objects.count(), 1)
        
        feedback_entry = OutfitFeedback.objects.first()
        self.assertEqual(feedback_entry.user_profile, self.user_profile1)
        self.assertEqual(feedback_entry.feedback_type, 'like')
        
        # Verify alerts are stored
        self.assertIn('alerts', feedback_entry.weather_data)
        self.assertEqual(len(feedback_entry.weather_data['alerts']), 2)
        self.assertEqual(feedback_entry.weather_data['alerts'][0]['event'], "Wind Advisory")
        self.assertEqual(feedback_entry.weather_data['alerts'][1]['description'], "High pollen count.")
        
        # Verify unit handling (consistent with other tests, it should be removed after conversion/processing)
        self.assertNotIn('unit', feedback_entry.weather_data)
        
        # Verify other basic weather data to ensure it's not lost and unit conversion happened if needed
        self.assertEqual(feedback_entry.weather_data['temperature'], 22) # Assuming Celsius was input
        self.assertEqual(feedback_entry.weather_data['feelsLike'], 21)

    def test_create_feedback_with_no_unit_assumes_celsius(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        weather_data_no_unit = {
            "datetime": "2025-06-04T12:00:00Z",
            "temperature": 15,
            "feels_like": 14,
            "weather_main": "Rain",
            # No unit field
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
        cls.user = User.objects.create_user(username='testusersuggest', password='password123')
        cls.user_profile = UserProfile.objects.create(user=cls.user, gender='Unspecified')
        cls.token = Token.objects.create(user=cls.user)
        cls.suggest_url = reverse('personalization-urls:suggest-outfit')

    def setUp(self):
        # self.client is already available from APITestCase
        # Individual test methods can set client credentials if needed
        pass

    def test_get_suggestion_success(self):
        payload = {
            'feels_like': 25,
            'temperature': 26,
            'precipitation_chance': 10,
            'weather_main': 'Clear',
            'weather_description': 'clear sky',
            'uv_index': 7,
            'wind_speed': 3,
            'is_day': True,
            'datetime': '2023-07-15T14:00:00Z',
            'user_gender': 'Man'
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggested_items', response.data)
        self.assertIn('advice_strings', response.data)
        self.assertIn('t_shirt', response.data['suggested_items'])

    def test_get_suggestion_missing_required_field(self):
        payload = {
            # 'feels_like': 25, # Missing feels_like
            'temperature': 26,
            'user_gender': 'Woman'
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('feels_like', response.data)
        self.assertEqual(response.data['feels_like'][0], 'This field is required.')

    def test_get_suggestion_invalid_gender(self):
        payload = {
            'feels_like': 20,
            'temperature': 20,
            'user_gender': 'Alien' # Invalid gender choice
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('user_gender', response.data)
        self.assertIn('is not a valid choice', response.data['user_gender'][0])

    def test_get_suggestion_optional_fields_not_provided(self):
        payload = {
            'feels_like': 18,
            'temperature': 18,
            'datetime': '2023-07-15T12:00:00Z',
            'weather_main': 'Clear',
            'precipitation_chance': 0
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggested_items', response.data)
        self.assertIn('advice_strings', response.data)
        self.assertIn('t_shirt', response.data['suggested_items'])
        self.assertIn('pants', response.data['suggested_items'])
        self.assertIn('sneakers', response.data['suggested_items'])
        self.assertIn('Mild temperatures. A light layer might be useful.', response.data['advice_strings'])

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_with_fahrenheit_conversion(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['test_item'], ['test_advice'])
        payload = {
            'feels_like': 32,  # 0°C
            'temperature': 23, # -5°C
            'unit': 'F',
            'datetime': '2023-07-15T14:00:00Z', # Required by serializer
            'weather_main': 'Clear', # Required by serializer if others like precip_chance not present
            'precipitation_chance': 0 # Ensure all required fields for logic are present or default
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        args_passed = mock_suggest_outfit_py.call_args[0]
        weather_data_arg = args_passed[0]
        gender_arg = args_passed[1]
        user_profile_arg = args_passed[2]

        self.assertEqual(gender_arg, 'Unspecified') # Defaults to 'Unspecified' if not in payload
        self.assertIsNone(user_profile_arg) # Unauthenticated request

        self.assertAlmostEqual(weather_data_arg['feels_like'], 0, places=2)
        self.assertAlmostEqual(weather_data_arg['temperature'], -5, places=2)
        self.assertNotIn('unit', weather_data_arg) # Unit should be removed before calling logic

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_with_explicit_celsius_unit(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['test_item'], ['test_advice'])
        payload = {
            'feels_like': 10,
            'temperature': 8,
            'unit': 'C',
            'datetime': '2023-07-15T15:00:00Z',
            'weather_main': 'Clouds',
            'precipitation_chance': 10
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        args_passed = mock_suggest_outfit_py.call_args[0]
        weather_data_arg = args_passed[0]
        gender_arg = args_passed[1]
        user_profile_arg = args_passed[2]

        self.assertEqual(gender_arg, 'Unspecified') # Defaults to 'Unspecified' if not in payload
        self.assertIsNone(user_profile_arg) # Unauthenticated request

        self.assertEqual(weather_data_arg['feels_like'], 10)
        self.assertEqual(weather_data_arg['temperature'], 8)
        self.assertNotIn('unit', weather_data_arg)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_with_no_unit_assumes_celsius(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['test_item'], ['test_advice'])
        payload = {
            'feels_like': 15,
            'temperature': 14,
            'datetime': '2023-07-15T16:00:00Z',
            'weather_main': 'Rain',
            'precipitation_chance': 60
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        args_passed = mock_suggest_outfit_py.call_args[0]
        weather_data_arg = args_passed[0]
        gender_arg = args_passed[1]
        user_profile_arg = args_passed[2]

        self.assertEqual(gender_arg, 'Unspecified') # Defaults to 'Unspecified' if not in payload
        self.assertIsNone(user_profile_arg) # Unauthenticated request

        self.assertEqual(weather_data_arg['feels_like'], 15)
        self.assertEqual(weather_data_arg['temperature'], 14)
        self.assertNotIn('unit', weather_data_arg)

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_authenticated_user_profile_passed(self, mock_suggest_outfit_py):
        mock_suggest_outfit_py.return_value = (['auth_item'], ['auth_advice'])
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        payload = {
            'feels_like': 22,
            'temperature': 22,
            'user_gender': 'Woman', # Gender from payload
            'datetime': '2023-07-15T17:00:00Z',
            'weather_main': 'Clear',
            'precipitation_chance': 5
        }
        response = self.client.post(self.suggest_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_suggest_outfit_py.assert_called_once()
        args_passed = mock_suggest_outfit_py.call_args[0]
        weather_data_arg = args_passed[0]
        gender_arg = args_passed[1]
        user_profile_arg = args_passed[2]

        self.assertEqual(weather_data_arg['feels_like'], 22)
        self.assertEqual(gender_arg, 'Woman')
        self.assertEqual(user_profile_arg, self.user_profile) # Check correct UserProfile instance

    @patch('apps.personalization.views.suggest_outfit_py')
    def test_get_suggestion_authenticated_user_no_profile_graceful_handling(self, mock_suggest_outfit_py):
        # Configure the UserProfile.DoesNotExist mock if needed, or rely on try-except in view
        # For this test, we'll simulate the user.userprofile access raising DoesNotExist.
        # This requires a bit more intricate mocking if we were to mock the request.user.userprofile directly.
        # A simpler way is to ensure the view's try-except UserProfile.DoesNotExist works.
        # Let's assume the view handles it. We need to ensure the user exists but profile might not.

        # Create a user without a profile for this specific test scenario
        temp_user_no_profile = User.objects.create_user(username='nouserprofile', password='password123')
        temp_token_no_profile = Token.objects.create(user=temp_user_no_profile)
        # Intentionally do NOT create a UserProfile for temp_user_no_profile

        mock_suggest_outfit_py.return_value = (['no_profile_item'], ['no_profile_advice'])
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {temp_token_no_profile.key}')

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
        args_passed = mock_suggest_outfit_py.call_args[0]
        weather_data_arg = args_passed[0]
        gender_arg = args_passed[1]
        user_profile_arg = args_passed[2]

        self.assertEqual(weather_data_arg['feels_like'], 20)
        self.assertEqual(gender_arg, 'Man')
        self.assertIsNone(user_profile_arg) # Should be None as UserProfile.DoesNotExist was caught

        # Clean up temporary user
        temp_user_no_profile.delete()

