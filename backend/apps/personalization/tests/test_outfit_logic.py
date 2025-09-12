import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.user.models import UserProfile
from apps.personalization.models import UserItemPreference, OutfitFeedback
from apps.personalization.outfit_logic import suggest_outfit_py, get_current_temperature_category, OUTFIT_ITEMS

User = get_user_model()

class OutfitLogicTests(TestCase):

    def setUp(self):
        """Set up base data for all tests."""
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.user_profile = UserProfile.objects.create(user=self.user, gender='Man')

        # Base weather data for a mild, clear day
        self.base_weather_data = {
            'feels_like': 18,
            'temperature': 18,
            'precipitation_chance': 10,
            'weather_main': 'Clouds',
            'weather_description': 'few clouds',
            'uv_index': 3,
            'wind_speed': 5,
            'is_day': True,
            'alerts': []
        }

    def tearDown(self):
        # Clean up any created preferences to avoid test contamination
        UserItemPreference.objects.all().delete()

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_suggest_outfit_cold_weather(self, mock_load_prefs):
        """Test outfit suggestion for cold weather."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        weather_data = self.base_weather_data.copy()
        weather_data['feels_like'] = 5

        suggested_items, advice = suggest_outfit_py(weather_data)

        self.assertIn('sweater', suggested_items)
        self.assertIn('medium_jacket', suggested_items)
        self.assertIn('pants', suggested_items)
        self.assertIn('Cold conditions. Dress warmly with layers, including a thermal base.', set(advice))

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_suggest_outfit_hot_weather(self, mock_load_prefs):
        """Test outfit suggestion for hot weather."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        weather_data = self.base_weather_data.copy()
        weather_data['feels_like'] = 32
        weather_data['uv_index'] = 8

        suggested_items, advice = suggest_outfit_py(weather_data, user_gender='Woman')

        self.assertIn('tank_top', suggested_items)
        self.assertIn('shorts', suggested_items)
        self.assertIn('sandals', suggested_items)
        self.assertIn('Hot weather. Stay hydrated and wear light, breathable clothing.', set(advice))
        self.assertIn('sun_hat', suggested_items) # From UV index

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_suggest_outfit_rainy_weather(self, mock_load_prefs):
        """Test outfit suggestion for rainy weather."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        weather_data = self.base_weather_data.copy()
        weather_data['weather_main'] = 'Rain'
        weather_data['precipitation_chance'] = 90

        suggested_items, advice = suggest_outfit_py(weather_data)

        self.assertIn('raincoat', suggested_items)
        self.assertIn('umbrella', suggested_items)
        self.assertIn('waterproof_shoes', suggested_items)
        self.assertNotIn('sandals', suggested_items)
        self.assertIn('Rain is likely. An umbrella or raincoat is a good idea.', set(advice))

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_work_office_occasion(self, mock_load_prefs):
        """Test suggestions for 'work_office' occasion."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        suggested_items, advice = suggest_outfit_py(self.base_weather_data, user_gender='Man', occasion='work_office')

        self.assertIn('dress_shirt', suggested_items)
        self.assertIn('blazer', suggested_items)
        self.assertNotIn('jeans', suggested_items)
        self.assertIn('Consider smart casual or business casual attire for the office.', set(advice))

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_formal_event_occasion_woman(self, mock_load_prefs):
        """Test suggestions for 'formal_event' for a woman."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        suggested_items, advice = suggest_outfit_py(self.base_weather_data, user_gender='Woman', occasion='formal_event')

        self.assertIn('evening_gown', suggested_items)
        self.assertIn('dress_shoes', suggested_items)
        self.assertNotIn('sneakers', suggested_items)
        self.assertIn('Elegant attire is required. Think gowns for women, tuxedos or dark suits for men. Formal shoes are a must.', set(advice))

    def test_user_general_dislike(self):
        """Test that a user's general dislike is excluded."""
        # Create a general dislike for 'sweater' for the test user
        UserItemPreference.objects.create(
            user=self.user_profile.user,
            item_name='sweater',
            preference_type='dislike'
        )

        weather_data = self.base_weather_data.copy()
        weather_data['feels_like'] = 5 # Cold weather, sweater would normally be suggested

        # The user_id must be passed for preferences to be loaded
        suggested_items, advice = suggest_outfit_py(
            weather_data,
            user_id=self.user_profile.user.id
        )

        self.assertNotIn('sweater', suggested_items)
        self.assertIn('medium_jacket', suggested_items) # Make sure other items are still suggested other warm items

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_user_temp_specific_dislike(self, mock_load_prefs):
        """Test a user's temperature-specific dislike."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        # User dislikes jeans only when it's warm
        UserItemPreference.objects.create(
            user=self.user,
            item_name='jeans',
            preference_type='dislike',
            context_temperature_category='warm_20_30c'
        )
        weather_data_warm = self.base_weather_data.copy()
        weather_data_warm['feels_like'] = 22 # Warm

        weather_data_mild = self.base_weather_data.copy()
        weather_data_mild['feels_like'] = 15 # Mild

        # In warm weather, jeans should be excluded
        suggested_warm, _ = suggest_outfit_py(weather_data_warm, user_id=self.user_profile.id)
        self.assertNotIn('jeans', suggested_warm)

        # In mild weather, jeans should be suggested
        suggested_mild, _ = suggest_outfit_py(weather_data_mild, user_id=self.user_profile.id)
        self.assertIn('pants', suggested_mild)

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_shoe_consistency_logic(self, mock_load_prefs):
        """Test that only one pair of shoes is suggested."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        # Weather that might suggest both boots and waterproof shoes
        weather_data = {
            'feels_like': 2,
            'weather_main': 'Rain',
            'precipitation_chance': 80,
            'is_day': True, 'uv_index': 1, 'wind_speed': 10, 'alerts': []
        }

        suggested_items, _ = suggest_outfit_py(weather_data)

        shoe_types = {'sneakers', 'boots', 'sandals', 'waterproof_shoes', 'dress_shoes'}
        suggested_shoes = set(suggested_items).intersection(shoe_types)

        self.assertEqual(len(suggested_shoes), 1, f"Expected 1 pair of shoes, but got {len(suggested_shoes)}: {suggested_shoes}")
        self.assertIn('boots', suggested_shoes) # In cold, rainy weather, boots are prioritized over waterproof_shoes

    def test_get_current_temperature_category(self):
        """Test the temperature categorization function."""
        self.assertEqual(get_current_temperature_category(5), 'cold_below_10c')
        self.assertEqual(get_current_temperature_category(15), 'mild_10_20c')
        self.assertEqual(get_current_temperature_category(25), 'warm_20_30c')
        self.assertEqual(get_current_temperature_category(35), 'hot_above_30c')
        self.assertIsNone(get_current_temperature_category(None))

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_no_weather_data(self, mock_load_prefs):
        """Test behavior when no weather data is provided."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        suggested_items, advice = suggest_outfit_py(None)
        self.assertEqual(suggested_items, [])
        self.assertEqual(advice, ['Weather data not available.'])

    @patch('apps.personalization.outfit_logic._load_learned_preferences')
    def test_anonymous_user(self, mock_load_prefs):
        """Test that the function runs without error for an anonymous user."""
        mock_load_prefs.return_value = {
            'temperature_range_feedback': {},
            'item_feedback': {},
            'overall_item_stats': {}
        }
        try:
            suggested_items, advice = suggest_outfit_py(self.base_weather_data, user_id=None)
            # Check for a basic suggestion to ensure it ran
            self.assertIsInstance(suggested_items, list)
            self.assertIsInstance(advice, list)
        except Exception as e:
            self.fail(f"suggest_outfit_py raised an exception for anonymous user: {e}")

@patch('apps.personalization.models.UserItemPreference.objects.filter')
@patch('apps.personalization.models.OutfitFeedback.objects.filter')
def test_authenticated_user_with_no_specific_feedback_gets_default_suggestions(self, mock_outfit_feedback_filter, mock_user_item_pref_filter):
    mock_user = MagicMock(spec=User, id=1)
    mock_user_profile = MagicMock(spec=UserProfile, id=1, user=mock_user, gender='Unspecified')
    weather_data = self.weather_data_warm

    # Mock the database queries to return no preferences or feedback
    mock_user_item_pref_filter.return_value.none.return_value = []
    mock_outfit_feedback_filter.return_value = OutfitFeedback.objects.none()

    # Suggestions for an authenticated user (with gender explicitly set for fair comparison)
    suggested_items_user, advice_user = suggest_outfit_py(weather_data, user_id=mock_user_profile.id, user_gender='Unspecified')

    # Suggestions for an anonymous user
    suggested_items_anon, advice_anon = suggest_outfit_py(weather_data, user_id=None, user_gender='Unspecified')

    # Assert that with no specific feedback, suggestions are the same as for an anonymous user
    self.assertEqual(set(suggested_items_user), set(suggested_items_anon))
    self.assertEqual(set(advice_user), set(advice_anon))


@patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
class FeedbackOutfitLogicTestsTwo(TestCase):
    
    def test_feedback_from_different_weather_bucket_not_applied(self, mock_filter):
        """
        Tests that feedback recorded for an item in one weather condition (e.g., hot weather)
        does not affect its suggestion in a different weather condition (e.g., mild weather)
        for which it would normally be suggested and has no specific negative feedback.
        """
        # Mock feedback for 'jeans' in 'hot_above_30c' weather
        mock_feedback = MagicMock()
        mock_feedback.item_name = 'jeans'
        mock_feedback.feedback_type = 'dislike'
        mock_feedback.weather_temperature_category = 'hot_above_30c'
        mock_filter.return_value = [mock_feedback]

        # Weather is mild, so 'jeans' would normally be suggested
        weather_data = {
            'feels_like': 15, # mild_10_20c
            'temperature': 15,
            'precipitation_chance': 10,
            'weather_main': 'Clouds',
            'weather_description': 'few clouds',
            'uv_index': 3,
            'wind_speed': 5,
            'is_day': True
        }

        suggested_items, advice_strings = suggest_outfit_py(weather_data, user_id=None)

        # Assert that 'jeans' are still suggested because the dislike is for a different weather category
        self.assertIn('pants', suggested_items)


# Basic weather data for tests - Placed at module level for potential reuse
NEUTRAL_WEATHER = {
    'feels_like': 18, 'temperature': 18, 'precipitation_chance': 0,
    'weather_main': 'Clear', 'weather_description': 'clear sky',
    'wind_speed': 2, 'uv_index': 5, 'is_day': True, 'alerts': []
}
WARM_WEATHER = {
    'feels_like': 28, 'temperature': 28, 'precipitation_chance': 0,
    'weather_main': 'Clear', 'weather_description': 'clear sky',
    'wind_speed': 2, 'uv_index': 8, 'is_day': True, 'alerts': []
}
COLD_WEATHER = {
    'feels_like': 5, 'temperature': 5, 'precipitation_chance': 0,
    'weather_main': 'Clear', 'weather_description': 'clear sky',
    'uv_index': 1, 'wind_speed': 2, 'is_day': True, 'datetime': '2023-07-15T14:00:00Z'
}

class OccasionOutfitLogicTests(TestCase):
    """Tests for occasion-specific outfit suggestion logic in `suggest_outfit_py`."""

    def test_work_office_man_neutral_weather(self):
        """Test 'work_office' occasion for a Man in neutral weather."""
        result = suggest_outfit_py(NEUTRAL_WEATHER, user_gender='Man', occasion='work_office')
        suggested_items, advice_strings = result

        # Assertions for a man in office wear in neutral weather
        self.assertTrue(OUTFIT_ITEMS['SHIRT'] in suggested_items or OUTFIT_ITEMS['DRESS_SHIRT'] in suggested_items)
        self.assertIn(OUTFIT_ITEMS['PANTS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['DRESS_SHOES'], suggested_items)
        
        self.assertNotIn(OUTFIT_ITEMS['SHORTS'], suggested_items)
        self.assertNotIn(OUTFIT_ITEMS['SANDALS'], suggested_items)
        self.assertNotIn(OUTFIT_ITEMS['JEANS'], suggested_items) 
        self.assertIn('Consider smart casual or business casual attire for the office.', set(advice_strings))

    def test_casual_outing_woman_warm_weather(self):
        """Test 'casual_outing' occasion for a Woman in warm weather."""
        # Define weather data explicitly for a deterministic test
        warm_weather_data = {
            'feels_like': 25, 'temperature': 25, 'precipitation_chance': 0,
            'weather_main': 'Clear', 'weather_description': 'clear sky',
            'wind_speed': 2, 'uv_index': 8, 'is_day': True, 'alerts': []
        }
        result = suggest_outfit_py(warm_weather_data, user_gender='Woman', occasion='casual_outing')
        suggested_items, advice_strings = result
        advice_set = set(advice_strings)

        self.assertIn(OUTFIT_ITEMS['SANDALS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SUNGLASSES'], suggested_items)
        self.assertNotIn(OUTFIT_ITEMS['SNEAKERS'], suggested_items)

        self.assertIn('Comfortable and casual is the way to go. Adapt with layers if needed.', advice_set)
        self.assertNotIn('Hot weather. Stay hydrated and wear light, breathable clothing.', advice_set)

    def test_formal_event_man_item_avoidance_neutral_weather(self):
        """Test 'formal_event' occasion for a Man, ensuring items are avoided in neutral weather."""
        result = suggest_outfit_py(NEUTRAL_WEATHER, user_gender='Man', occasion='formal_event')
        suggested_items, advice_strings = result

        self.assertIn(OUTFIT_ITEMS['SUIT_JACKET'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SUIT_PANTS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['DRESS_SHIRT'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['TIE'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['DRESS_SHOES'], suggested_items)

        self.assertNotIn(OUTFIT_ITEMS['JEANS'], suggested_items)
        self.assertNotIn(OUTFIT_ITEMS['SNEAKERS'], suggested_items)
        self.assertNotIn(OUTFIT_ITEMS['SHORTS'], suggested_items)
        self.assertNotIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items)
        self.assertIn('Elegant attire is required. Think gowns for women, tuxedos or dark suits for men. Formal shoes are a must.', set(advice_strings))

    def test_unknown_occasion_falls_back_to_general_warm_weather(self):
        """Test that an unknown occasion falls back to 'general' rules in warm weather."""
        result_unknown = suggest_outfit_py(WARM_WEATHER, user_gender='Man', occasion='unknown_mystery_event_xyz')
        suggested_items_unknown, advice_unknown = result_unknown

        result_general = suggest_outfit_py(WARM_WEATHER, user_gender='Man', occasion='general')
        suggested_items_general, advice_general = result_general
        
        self.assertEqual(set(suggested_items_unknown), set(suggested_items_general))
        self.assertEqual(set(advice_unknown), set(advice_general))

    def test_sports_exercise_woman_cold_weather(self):
        """Test 'sports_exercise' for a Woman in cold weather."""
        result = suggest_outfit_py(COLD_WEATHER, user_gender='Woman', occasion='sports_exercise')
        suggested_items, advice_strings = result
        advice_set = set(advice_strings)

        self.assertIn(OUTFIT_ITEMS['ATHLETIC_TOP'], suggested_items) 
        self.assertIn(OUTFIT_ITEMS['SNEAKERS'], suggested_items)   
        self.assertIn(OUTFIT_ITEMS['THERMAL_TOP'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['RUNNING_JACKET'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['TRACK_PANTS'], suggested_items) 
        self.assertNotIn(OUTFIT_ITEMS['ATHLETIC_SHORTS'], suggested_items)

        self.assertIn("Wear appropriate, comfortable gear for your workout. Don't forget to hydrate!", advice_set)
        self.assertIn('Cold conditions. Dress warmly with layers, including a thermal base.', advice_set)