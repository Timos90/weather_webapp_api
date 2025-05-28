# backend/apps/personalization/tests/test_models.py
from django.test import TestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile  # Assuming UserProfile is in apps.user.models
from apps.personalization.models import OutfitFeedback

class OutfitFeedbackModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create a user and user profile for testing
        cls.user = User.objects.create_user(username='testuser_pf', password='password123', email='testuser_pf@example.com')
        cls.user_profile = UserProfile.objects.create(user=cls.user, location='Test City', preferred_temperature_unit='C', gender='Male')

        # Sample weather_data and suggested_outfit for the feedback
        cls.weather_data_sample = {
            "datetime": "2025-05-28T12:00:00Z",
            "temperature": 25,
            "feelsLike": 26,
            "weatherMain": "Clear"
        }
        cls.suggested_outfit_sample = {
            "items": ["t_shirt", "shorts", "sunglasses"],
            "advice": ["Stay hydrated."]
        }

        cls.feedback = OutfitFeedback.objects.create(
            user_profile=cls.user_profile,
            weather_data=cls.weather_data_sample,
            suggested_outfit=cls.suggested_outfit_sample,
            feedback_type='like',
            user_gender_at_feedback=cls.user_profile.gender
        )

    def test_outfit_feedback_creation(self):
        self.assertIsInstance(self.feedback, OutfitFeedback)
        self.assertEqual(self.feedback.user_profile, self.user_profile)
        self.assertEqual(self.feedback.feedback_type, 'like')
        self.assertEqual(self.feedback.weather_data['temperature'], 25)
        self.assertIn('t_shirt', self.feedback.suggested_outfit['items'])
        self.assertEqual(self.feedback.user_gender_at_feedback, 'Male')
        self.assertIsNotNone(self.feedback.timestamp)

    def test_outfit_feedback_str_representation(self):
        expected_str = f"Feedback from {self.user_profile.user.username} at {self.feedback.timestamp.strftime('%Y-%m-%d %H:%M')}: like"
        self.assertEqual(str(self.feedback), expected_str)

    def test_feedback_type_choices(self):
        feedback_like = OutfitFeedback.objects.create(
            user_profile=self.user_profile,
            weather_data=self.weather_data_sample,
            suggested_outfit=self.suggested_outfit_sample,
            feedback_type='like',
            user_gender_at_feedback='Female' 
        )
        feedback_dislike = OutfitFeedback.objects.create(
            user_profile=self.user_profile,
            weather_data=self.weather_data_sample,
            suggested_outfit=self.suggested_outfit_sample,
            feedback_type='dislike',
            user_gender_at_feedback='Other'
        )
        self.assertEqual(feedback_like.feedback_type, 'like')
        self.assertEqual(feedback_dislike.feedback_type, 'dislike')

    def test_user_gender_at_feedback_storage(self):
        self.assertEqual(self.feedback.user_gender_at_feedback, 'Male')
        # Test with a different gender to ensure it's stored correctly
        feedback_other_gender = OutfitFeedback.objects.create(
            user_profile=self.user_profile,
            weather_data=self.weather_data_sample,
            suggested_outfit=self.suggested_outfit_sample,
            feedback_type='like',
            user_gender_at_feedback='Non-binary'
        )
        self.assertEqual(feedback_other_gender.user_gender_at_feedback, 'Non-binary')
