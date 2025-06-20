from django.test import TestCase
from django.contrib.auth.models import User
from apps.user.models import UserProfile
from apps.personalization.models import UserItemPreference
from apps.personalization.outfit_logic import suggest_outfit_py, OUTFIT_ITEMS

# Items from OUTFIT_ITEMS for testing
TEST_ITEM_SUN_HAT = OUTFIT_ITEMS.get('SUN_HAT', 'sun_hat') 
TEST_ITEM_JACKET = OUTFIT_ITEMS.get('LIGHT_JACKET', 'light_jacket')
TEST_ITEM_SANDALS = OUTFIT_ITEMS.get('SANDALS', 'sandals')


class PersonalizedOutfitLogicTests(TestCase):
    def setUp(self):
        """Set up a test user and profile for all tests."""
        self.test_user = User.objects.create_user(
            username='testuser', 
            password='password123',
            email='testuser@example.com'
        )
        self.user_profile = UserProfile.objects.create(
            user=self.test_user,
            gender='Man' # Or any default gender for consistent base suggestions
        )
        # print(f"Created user '{self.test_user.username}' with profile for tests.")

    def test_general_dislike_filter(self):
        """Test that an item is filtered out due to a general dislike."""
        # Create a general dislike for 'sun_hat' for the test user
        UserItemPreference.objects.create(
            user=self.test_user,
            item_name=TEST_ITEM_SUN_HAT,
            preference_type='dislike'
            # No context_temperature_category or context_alert_event for general dislike
        )
        # print(f"Created general dislike for '{TEST_ITEM_SUN_HAT}' for user '{self.test_user.username}'.")

        # Weather data that would normally suggest a sun_hat (e.g., high UV)
        weather_data = {
            "temperature": 25, "feels_like": 26, "humidity": 50, "wind_speed": 5,
            "weather_main": "Clear", "weather_description": "clear sky", "uv_index": 8,
            "precipitation_chance": 0, "is_day": True, "alerts": []
        }

        suggested_items, _ = suggest_outfit_py(
            weather_data=weather_data,
            user_gender=self.user_profile.gender,
            user_profile=self.user_profile
        )
        
        # print(f"Suggested items for general dislike test: {suggested_items}")
        self.assertNotIn(TEST_ITEM_SUN_HAT, suggested_items,
                         f"'{TEST_ITEM_SUN_HAT}' should NOT be suggested due to general dislike.")

    def test_item_suggested_when_no_dislike(self):
        """Test that an item is suggested when no relevant dislike exists."""
        # Ensure no dislike for 'sun_hat' exists for this specific test
        # (setUp doesn't create dislikes, so it should be clean unless a previous test failed badly)

        # Weather data that would normally suggest a sun_hat
        weather_data = {
            "temperature": 25, "feels_like": 26, "humidity": 50, "wind_speed": 5,
            "weather_main": "Clear", "weather_description": "clear sky", "uv_index": 8,
            "precipitation_chance": 0, "is_day": True, "alerts": []
        }

        suggested_items, _ = suggest_outfit_py(
            weather_data=weather_data,
            user_gender=self.user_profile.gender,
            user_profile=self.user_profile
        )
        
        # print(f"Suggested items for no dislike test: {suggested_items}")
        self.assertIn(TEST_ITEM_SUN_HAT, suggested_items,
                      f"'{TEST_ITEM_SUN_HAT}' SHOULD be suggested as no dislike is present and UV is high.")

    # We will add more test methods for temperature-specific and alert-specific dislikes next.
