# backend/apps/personalization/tests/test_serializers.py
from django.test import TestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile
from apps.personalization.serializers import OutfitFeedbackSerializer, OutfitSuggestionRequestSerializer
from rest_framework.exceptions import ValidationError
from apps.personalization.models import OutfitFeedback

class OutfitFeedbackSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testserializeruser', password='password123')
        cls.user_profile = UserProfile.objects.create(user=cls.user, gender='Male')

        cls.weather_data_sample = {
            "datetime": "2025-05-29T10:00:00Z",
            "temperature": 22,
            "feelsLike": 23,
            "weatherMain": "Clouds"
        }
        cls.suggested_outfit_sample = {
            "items": ["sweater", "pants"],
            "advice": ["Might be a bit chilly."]
        }

        cls.feedback_attributes = {
            'user_profile': cls.user_profile, # In real scenario, view adds this before serializer.save()
            'weather_data': cls.weather_data_sample,
            'suggested_outfit': cls.suggested_outfit_sample,
            'feedback_type': 'like',
            'user_gender_at_feedback': 'Male'
        }

        cls.feedback_instance = OutfitFeedback.objects.create(**cls.feedback_attributes)
        cls.serializer = OutfitFeedbackSerializer(instance=cls.feedback_instance)

    def test_serializer_contains_expected_fields(self):
        data = self.serializer.data
        self.assertEqual(set(data.keys()), set([
            'id', 'user_profile', 'weather_data', 'suggested_outfit',
            'feedback_type', 'user_gender_at_feedback', 'timestamp'
        ]))
        self.assertEqual(data['user_profile'], self.user_profile.id) # Default is PK

    def test_serializer_weather_data_content(self):
        data = self.serializer.data
        self.assertEqual(data['weather_data']['temperature'], 22)
        self.assertEqual(data['weather_data']['datetime'], "2025-05-29T10:00:00Z")

    def test_serializer_feedback_type_validation_valid(self):
        valid_data = {
            # 'user_profile' would be added by the view before validation in a real POST
            'weather_data': self.weather_data_sample,
            'suggested_outfit': self.suggested_outfit_sample,
            'feedback_type': 'dislike',
            'user_gender_at_feedback': 'Woman'
        }
        serializer = OutfitFeedbackSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_feedback_type_validation_invalid(self):
        invalid_data = {
            'weather_data': self.weather_data_sample,
            'suggested_outfit': self.suggested_outfit_sample,
            'feedback_type': 'invalid_choice', # This is the invalid part
            'user_gender_at_feedback': 'Male'
        }
        serializer = OutfitFeedbackSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('feedback_type', serializer.errors)
        self.assertIn('"invalid_choice" is not a valid choice.', str(serializer.errors['feedback_type']))

    def test_serializer_required_fields(self):
        # Test without weather_data (which is required by model, not blank/null)
        incomplete_data = {
            'suggested_outfit': self.suggested_outfit_sample,
            'feedback_type': 'like',
            'user_gender_at_feedback': 'Male'
        }
        serializer = OutfitFeedbackSerializer(data=incomplete_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('weather_data', serializer.errors)

        # Test without feedback_type
        incomplete_data_2 = {
            'weather_data': self.weather_data_sample,
            'suggested_outfit': self.suggested_outfit_sample,
            'user_gender_at_feedback': 'Male'
        }
        serializer = OutfitFeedbackSerializer(data=incomplete_data_2)
        self.assertFalse(serializer.is_valid())
        self.assertIn('feedback_type', serializer.errors)

    def test_serializer_user_gender_at_feedback_optional_in_model_but_required_by_serializer(self):
        # Model allows blank=True, null=True for user_gender_at_feedback
        # Serializer by default makes fields required unless explicitly not.
        # Let's confirm it's required by the serializer unless specified otherwise.
        data_without_gender = {
            'weather_data': self.weather_data_sample,
            'suggested_outfit': self.suggested_outfit_sample,
            'feedback_type': 'like',
        }
        serializer = OutfitFeedbackSerializer(data=data_without_gender)
        # Depending on serializer definition, this might be true or false.
        # Default ModelSerializer behavior: if model field allows blank, serializer field is not required.
        # If model field has null=True but not blank=True, serializer field is required.
        # Our model has user_gender_at_feedback with blank=True, null=True.
        # So, the serializer should NOT require it.
        self.assertTrue(serializer.is_valid(), serializer.errors)
        # If we wanted it required by serializer: add `required=True` to the field or remove `blank=True` from model.

    def test_serializer_create_method(self):
        valid_data_for_create = {
            'user_profile': self.user_profile, # Simulating view adding this
            'weather_data': self.weather_data_sample,
            'suggested_outfit': self.suggested_outfit_sample,
            'feedback_type': 'dislike',
            'user_gender_at_feedback': 'Other'
        }
        serializer = OutfitFeedbackSerializer()
        # We are directly calling create, so we pass the full validated_data structure
        instance = serializer.create(validated_data=valid_data_for_create)
        self.assertIsInstance(instance, OutfitFeedback)
        self.assertEqual(instance.feedback_type, 'dislike')
        self.assertEqual(instance.user_profile, self.user_profile)
        self.assertEqual(instance.user_gender_at_feedback, 'Other')


class OutfitSuggestionRequestSerializerTest(TestCase):
    def setUp(self):
        self.base_payload = {
            'feels_like': 20.0,
            'temperature': 22.0,
            'precipitation_chance': 10,
            'weather_main': 'Clear',
            'weather_description': 'clear sky',
            'uv_index': 5,
            'wind_speed': 2.5,
            'is_day': True,
            'datetime': '2024-01-01T12:00:00Z',
            'user_gender': 'Man'
        }

    def test_valid_payload_all_fields(self):
        payload = {**self.base_payload, 'unit': 'C'}
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_valid_unit_celsius(self):
        payload = {**self.base_payload, 'unit': 'C'}
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['unit'], 'C')

    def test_valid_unit_fahrenheit(self):
        payload = {**self.base_payload, 'unit': 'F'}
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['unit'], 'F')

    def test_unit_not_provided_is_valid(self):
        payload = {**self.base_payload} # unit is not provided
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        # Check that 'unit' is in validated_data and defaults to 'C' (as per serializer field default)
        self.assertIn('unit', serializer.validated_data)
        self.assertEqual(serializer.validated_data['unit'], 'C')

    def test_invalid_unit_kelvin(self):
        payload = {**self.base_payload, 'unit': 'K'}
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('unit', serializer.errors)
        self.assertIn('"K" is not a valid choice.', str(serializer.errors['unit']))

    def test_invalid_unit_empty_string(self):
        payload = {**self.base_payload, 'unit': ''}
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('unit', serializer.errors)
        self.assertIn('"" is not a valid choice.', str(serializer.errors['unit']))

    def test_missing_required_field_feels_like(self):
        payload = {**self.base_payload}
        del payload['feels_like']
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('feels_like', serializer.errors)

    def test_missing_required_field_temperature(self):
        payload = {**self.base_payload}
        del payload['temperature']
        serializer = OutfitSuggestionRequestSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('temperature', serializer.errors)

    def test_optional_fields_not_provided(self):
        # Test with only required fields + unit
        required_payload = {
            'feels_like': 20.0,
            'temperature': 22.0,
            'datetime': '2024-01-01T12:00:00Z',
            'weather_main': 'Clear', # This is required because precipitation_chance is not always enough
            'unit': 'C'
        }
        serializer = OutfitSuggestionRequestSerializer(data=required_payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        validated_data = serializer.validated_data
        # Check fields with defaults
        self.assertEqual(validated_data.get('user_gender'), 'Unspecified') # Default value
        self.assertEqual(validated_data.get('precipitation_chance'), 0)   # Default value
        self.assertEqual(validated_data.get('unit'), 'C')                 # Default value (from payload)
        self.assertEqual(validated_data.get('is_day'), True)              # Default value

        # Check optional fields that allow null and have no explicit default (should be None if not provided)
        self.assertIsNone(validated_data.get('weather_description'))
        self.assertIsNone(validated_data.get('uv_index'))
        self.assertIsNone(validated_data.get('wind_speed'))
        self.assertIsNone(validated_data.get('humidity'))
        self.assertIsNone(validated_data.get('cloud_cover'))
        self.assertIsNone(validated_data.get('air_quality_index'))
