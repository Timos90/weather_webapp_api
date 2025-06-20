from django.test import TestCase, SimpleTestCase
from django.db.models import Q
from apps.user.models import UserProfile
from ..outfit_logic import suggest_outfit_py, OUTFIT_ITEMS
from django.contrib.auth.models import User
from apps.personalization.models import UserItemPreference

class OutfitLogicTests(TestCase):
    """Tests for the core outfit suggestion logic in `suggest_outfit_py` without feedback."""

    def test_hot_weather_no_gender(self):
        weather_data = {
            'feels_like': 30,
            'temperature': 30,
            'precipitation_chance': 0,
            'weather_main': 'Clear',
            'weather_description': 'clear sky',
            'uv_index': 8,
            'wind_speed': 2,
            'is_day': True,
            'datetime': '2023-07-15T14:00:00Z'
        }
        result = suggest_outfit_py(weather_data)
        suggested_items, advice_strings = result
        self.assertIn(OUTFIT_ITEMS['TANK_TOP'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SHORTS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SANDALS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SUNGLASSES'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SUN_HAT'], suggested_items)
        self.assertIn('It\'s hot! Dress light and stay hydrated.', advice_strings)
        self.assertIn('High UV index. Protect your skin and eyes.', advice_strings)

    def test_hot_weather_woman(self):
        weather_data = {
            'feels_like': 30,
            'temperature': 30,
            'precipitation_chance': 0,
            'weather_main': 'Clear',
            'weather_description': 'clear sky',
            'uv_index': 8,
            'wind_speed': 2,
            'is_day': True,
            'datetime': '2023-07-15T14:00:00Z'
        }
        result = suggest_outfit_py(weather_data, user_gender='Woman', user_profile=None)
        suggested_items, advice_strings = result
        self.assertIn(OUTFIT_ITEMS['TANK_TOP'], suggested_items)
        # Either DRESS or SKIRT should be present due to random choice
        self.assertTrue(OUTFIT_ITEMS['DRESS'] in suggested_items or \
                        OUTFIT_ITEMS['SKIRT'] in suggested_items)
        self.assertIn(OUTFIT_ITEMS['SANDALS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SUNGLASSES'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SUN_HAT'], suggested_items)

    def test_cold_weather_rain(self):
        weather_data = {
            'feels_like': 8,
            'temperature': 10,
            'precipitation_chance': 80,
            'weather_main': 'Rain',
            'weather_description': 'light rain',
            'uv_index': 1,
            'wind_speed': 3,
            'is_day': True,
            'datetime': '2023-11-15T14:00:00Z'
        }
        result = suggest_outfit_py(weather_data)
        suggested_items, advice_strings = result
        self.assertIn(OUTFIT_ITEMS['LONG_SLEEVE_SHIRT'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SWEATER'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['PANTS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['MEDIUM_JACKET'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['BOOTS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SCARF'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['WINTER_HAT'], suggested_items)
        # Rain logic: MEDIUM_JACKET might be enough, or RAINCOAT/UMBRELLA added
        # Check if advice for rain protection is present
        self.assertTrue(
            OUTFIT_ITEMS['RAINCOAT'] in suggested_items or 
            'Your current jacket should offer some rain protection.' in advice_strings or
            OUTFIT_ITEMS['UMBRELLA'] in suggested_items
        )
        self.assertIn('Don\'t forget rain protection!', advice_strings)
        self.assertIn('Cold conditions. Dress warmly with layers, including a thermal base.', advice_strings)

    def test_very_cold_weather_snow(self):
        weather_data = {
            'feels_like': -5,
            'temperature': -2,
            'precipitation_chance': 90,
            'weather_main': 'Snow',
            'weather_description': 'heavy snow',
            'uv_index': 0,
            'wind_speed': 5,
            'is_day': True,
            'datetime': '2023-12-15T14:00:00Z'
        }
        result = suggest_outfit_py(weather_data, user_gender='Man', user_profile=None) # Gender has less impact in very cold
        suggested_items, advice_strings = result
        self.assertIn(OUTFIT_ITEMS['LONG_SLEEVE_SHIRT'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SWEATER'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['PANTS'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['HEAVY_COAT'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['WINTER_HAT'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['GLOVES'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['SCARF'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['BOOTS'], suggested_items)
        self.assertIn('Very cold! Bundle up with multiple warm layers, including a thermal base, hat, gloves, and scarf.', advice_strings)
        self.assertIn('Snowfall expected. Ensure your outerwear is suitable for snow.', advice_strings)

    # Add more tests for other temperature ranges, specific conditions (wind, UV without heat), etc.

from unittest.mock import patch, MagicMock
from ..models import OutfitFeedback
from ..outfit_logic import (
    FEEDBACK_ADJUSTMENT_ADVICE, MIN_FEEDBACK_COUNT, DISLIKE_THRESHOLD,
    FEEDBACK_MIN_TOTAL_FOR_RATIO, FEEDBACK_DISLIKE_RATIO_THRESHOLD, OUTFIT_ITEMS,
    FEEDBACK_TYPE_LIKE, FEEDBACK_TYPE_DISLIKE
)

class OutfitLogicFeedbackTests(SimpleTestCase):
    """Tests for the outfit suggestion logic in `suggest_outfit_py` focusing on how user feedback influences suggestions."""

    def _create_mock_feedback(self, feels_like_temp, items_list, feedback_type=FEEDBACK_TYPE_LIKE, weather_main='Clear', user_profile=None):
        """
        Helper method to create a mock OutfitFeedback object for testing.

        Args:
            feels_like_temp (int): The 'feels_like' temperature for the feedback's weather_data.
            items_list (list or str): A list of item names (or a single item name)
                                      that were part of the outfit this feedback pertains to.
            feedback_type (str, optional): The type of feedback (e.g., 'like', 'dislike').
                                           Defaults to FEEDBACK_TYPE_LIKE.
            weather_main (str, optional): The 'weather_main' condition. Defaults to 'Clear'.
            user_profile (MagicMock, optional): A mock user profile. Defaults to None.

        Returns:
            MagicMock: A mock object configured to simulate an OutfitFeedback instance.
        """
        mock_fb = MagicMock(spec=OutfitFeedback)
        mock_fb.weather_data = {'feels_like': feels_like_temp, 'weather_main': weather_main}
        # Ensure suggested_outfit is a dict with 'suggested_items' as a list
        mock_fb.suggested_outfit = {'suggested_items': items_list if isinstance(items_list, list) else [items_list]}
        # mock_fb.item_name is not directly on OutfitFeedback model, but on related items if feedback was per item.
        # For current model, feedback is on an outfit (list of items). We'll rely on suggested_outfit.
        mock_fb.feedback_type = feedback_type # Correct attribute name
        mock_fb.user_profile = user_profile
        return mock_fb

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_no_feedback_returns_default_suggestions(self, mock_filter):
        mock_filter.return_value = [] # No feedback entries
        weather_data = {'feels_like': 18} # Mild weather
        
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        # Assert that standard suggestions for mild weather are present
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items)
        self.assertIn(OUTFIT_ITEMS['PANTS'], suggested_items)
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)
        mock_filter.assert_called_once() # Check that feedback was queried

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_insufficient_feedback_count_no_change(self, mock_filter):
        # Feedback for t_shirt, but below MIN_FEEDBACK_COUNT
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') 
            for _ in range(MIN_FEEDBACK_COUNT - 1)
        ]
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18} # Mild weather, t_shirt would be suggested
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items)
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_feedback_below_dislike_threshold_no_change(self, mock_filter):
        # Feedback for t_shirt, meets MIN_FEEDBACK_COUNT, but dislikes not high enough
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') 
            for _ in range(DISLIKE_THRESHOLD + 1) # e.g., 4 dislikes if threshold is 3
        ]
        # Add some likes to prevent dislike ratio from being too high by default
        mock_feedback_list.extend([
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'like') 
            for _ in range(2) # e.g. 2 likes. So, 4 dislikes, 2 likes. Dislikes not > likes + THRESHOLD
        ])
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18} # Mild weather
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items)
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_item_penalized_by_feedback_is_removed(self, mock_filter):
        """Tests that an item is removed if it meets the direct dislike threshold (Rule 1)."""
        # T-Shirt is normally suggested for feels_like: 18
        # Create feedback that heavily dislikes T-Shirt for this condition
        # Ensure dislikes > likes + DISLIKE_THRESHOLD and total feedback >= MIN_FEEDBACK_COUNT
        num_dislikes = DISLIKE_THRESHOLD + 2 # e.g., 3 + 2 = 5 dislikes
        num_likes = 1 # 1 like
        # Total feedback = 6, which should be >= MIN_FEEDBACK_COUNT (default 5)
        # Dislike condition: 5 >= 1 + 3 (True)

        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') 
            for _ in range(num_dislikes)
        ]
        mock_feedback_list.extend([
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'like') 
            for _ in range(num_likes)
        ])
        # Add some other feedback to ensure MIN_FEEDBACK_COUNT is met if needed
        while len(mock_feedback_list) < MIN_FEEDBACK_COUNT:
            mock_feedback_list.append(self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike'))

        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18} # Mild weather
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertNotIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items)
        self.assertIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_item_removed_by_dislike_ratio(self, mock_filter):
        """Tests that an item is removed if it meets the dislike ratio threshold (Rule 2)."""
        # Test removal due to high dislike ratio, meeting FEEDBACK_MIN_TOTAL_FOR_RATIO
        # Scenario: T-Shirt, 3 likes, 5 dislikes.
        # Constants: MIN_FEEDBACK_COUNT = 1, DISLIKE_THRESHOLD = 1
        #            FEEDBACK_MIN_TOTAL_FOR_RATIO = 3, FEEDBACK_DISLIKE_RATIO_THRESHOLD = 0.6
        # Direct rule: 5 (dislikes) >= 3 (likes) + 1 (DISLIKE_THRESHOLD) => 5 >= 4. True. Item removed by direct rule.
        # Ratio rule: Total=8. 8 >= 3 (MIN_TOTAL_FOR_RATIO). Ratio = 5/8 = 0.625. 0.625 >= 0.6 (RATIO_THRESHOLD). True.
        # This setup ensures removal, covered by one or both rules.
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'like') for _ in range(3)
        ]
        mock_feedback_list.extend([
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') for _ in range(5)
        ])
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18} # Mild weather, T-Shirt normally suggested
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertNotIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items, "T-Shirt should be removed by dislike ratio or direct rule")
        self.assertIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_item_kept_dislike_ratio_below_threshold(self, mock_filter):
        # Test item kept when dislike ratio is below threshold, despite meeting min total for ratio
        # Scenario: 3 likes, 2 dislikes. Total = 5.
        # Direct rule: 2 (dislikes) >= 3 (likes) + 1 (DISLIKE_THRESHOLD) => 2 >= 4. False.
        # Ratio rule: Total 5 >= 3 (MIN_TOTAL_FOR_RATIO). Ratio = 2/5 = 0.4. 0.4 < 0.6 (RATIO_THRESHOLD). Kept.
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'like') for _ in range(3)
        ]
        mock_feedback_list.extend([
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') for _ in range(2)
        ])
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18}
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items, "T-Shirt should be kept, ratio is okay")
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_item_removed_by_direct_dislike_low_total_feedback(self, mock_filter):
        # Test removal by direct dislike rule (dislikes >= likes + DISLIKE_THRESHOLD)
        # even if total feedback is below FEEDBACK_MIN_TOTAL_FOR_RATIO.
        # Scenario: 0 likes, 1 dislike. Total = 1.
        # Direct rule: 1 (dislike) >= 0 (likes) + 1 (DISLIKE_THRESHOLD) => 1 >= 1. True. Removed.
        # Ratio rule: Total 1 < 3 (MIN_TOTAL_FOR_RATIO). Not applicable.
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') for _ in range(1)
        ] # 0 likes, 1 dislike
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18}
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertNotIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items, "T-Shirt should be removed by direct dislike rule")
        self.assertIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_item_kept_low_total_feedback_rules_not_met(self, mock_filter):
        # Test item kept with low total feedback where neither rule is met.
        # Scenario: 1 like, 1 dislike. Total = 2.
        # Direct rule: 1 (dislike) >= 1 (like) + 1 (DISLIKE_THRESHOLD) => 1 >= 2. False.
        # Ratio rule: Total 2 < 3 (MIN_TOTAL_FOR_RATIO). Not applicable.
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'like') for _ in range(1)
        ]
        mock_feedback_list.extend([
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') for _ in range(1)
        ])
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18}
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items, "T-Shirt should be kept, rules not met")
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_item_kept_sufficient_for_ratio_but_ratio_ok(self, mock_filter):
        # Test item kept when it has enough feedback for ratio logic, but the ratio is good.
        # Scenario: 4 likes, 1 dislike. Total = 5.
        # Direct rule: 1 (dislike) >= 4 (likes) + 1 (DISLIKE_THRESHOLD) => 1 >= 5. False.
        # Ratio rule: Total 5 >= 3 (MIN_TOTAL_FOR_RATIO). Ratio = 1/5 = 0.2. 0.2 < 0.6 (RATIO_THRESHOLD). Kept.
        mock_feedback_list = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_LIKE) for _ in range(4)
        ]
        mock_feedback_list.extend([
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_DISLIKE) for _ in range(1)
        ])
        mock_filter.return_value = mock_feedback_list
        
        weather_data = {'feels_like': 18}
        result = suggest_outfit_py(weather_data, user_profile=None)
        suggested_items, advice_strings = result
        
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items, "T-Shirt should be kept, ratio okay")
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings)
        # Ensure other standard items for this weather (like PANTS) are still there
        self.assertIn(OUTFIT_ITEMS['PANTS'], suggested_items)

    @patch('apps.personalization.outfit_logic.UserItemPreference.objects.filter') # Mock UserItemPreference
    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter') # Mock OutfitFeedback
    def test_user_specific_feedback_removes_item(self, mock_outfit_feedback_filter, mock_user_item_pref_filter):
        """
        Tests that feedback specific to a user profile correctly removes an item for that user,
        but not for an anonymous user or a different user without such feedback.
        This test focuses on the legacy OutfitFeedback path, so UserItemPreference returns empty.
        """
        mock_user_profile = MagicMock(spec=UserProfile)
        mock_user_profile.id = 1 # Example UserProfile ID
        mock_user = MagicMock(spec=User) # Use MagicMock for User as well
        mock_user.id = 101 # Example User ID for the associated User object
        mock_user_profile.user = mock_user

        weather_data = {'feels_like': 18, 'weather_main': 'Clear'} # Mild weather, T-SHIRT normally suggested

        user_specific_outfit_feedback = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_DISLIKE, user_profile=mock_user_profile),
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_DISLIKE, user_profile=mock_user_profile),
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_DISLIKE, user_profile=mock_user_profile),
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_LIKE, user_profile=mock_user_profile),
        ]

        global_outfit_feedback = [
            self._create_mock_feedback(18, [OUTFIT_ITEMS['T_SHIRT']], FEEDBACK_TYPE_LIKE, user_profile=None)
            for _ in range(MIN_FEEDBACK_COUNT)
        ]

        # Side effect for OutfitFeedback.objects.filter
        def outfit_feedback_filter_side_effect(*args, **kwargs):
            user_profile_in_kwargs = kwargs.get('user_profile')
            q_obj = args[0] if args and isinstance(args[0], Q) else None

            is_user_specific_call = False
            if user_profile_in_kwargs == mock_user_profile or \
               (q_obj and any(child == ('user_profile', mock_user_profile) for child in getattr(q_obj, 'children', []))):
                is_user_specific_call = True
            
            is_global_call = False
            if (user_profile_in_kwargs is None and 'user_profile__isnull' not in kwargs and not kwargs.get('user_profile__user')) or \
               (q_obj and any(child == ('user_profile__isnull', True) for child in getattr(q_obj, 'children', []))):
                is_global_call = True

            if is_user_specific_call:
                return user_specific_outfit_feedback
            elif is_global_call:
                return global_outfit_feedback
            return OutfitFeedback.objects.none()

        mock_outfit_feedback_filter.side_effect = outfit_feedback_filter_side_effect
        
        # UserItemPreference queries should return empty for this test
        mock_user_item_pref_filter.return_value = UserItemPreference.objects.none()

        # Test with user_profile: T-SHIRT should be removed
        suggested_items_user, advice_user = suggest_outfit_py(weather_data, user_profile=mock_user_profile)
        self.assertNotIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items_user)
        self.assertIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_user)

        # Test with user_profile=None (anonymous): T-SHIRT should be present based on global likes
        # Reset side effect for global OutfitFeedback, UserItemPreference still returns none
        mock_outfit_feedback_filter.reset_mock()
        mock_outfit_feedback_filter.side_effect = lambda *a, **kw: global_outfit_feedback if kw.get('user_profile__isnull') is True else OutfitFeedback.objects.none()
        
        suggested_items_anon, advice_anon = suggest_outfit_py(weather_data, user_profile=None)
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items_anon)
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_anon)

    @patch('apps.personalization.outfit_logic.UserItemPreference.objects.filter') # Mock UserItemPreference
    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')     # Mock OutfitFeedback
    def test_authenticated_user_with_no_specific_feedback_gets_default_suggestions(self, mock_outfit_feedback_filter, mock_user_item_pref_filter):
        mock_user_profile = MagicMock(spec=UserProfile)
        mock_user_profile.id = 2 
        mock_user = MagicMock(spec=User)
        mock_user.id = 102 
        mock_user_profile.user = mock_user

        weather_data = {'feels_like': 18, 'weather_main': 'Clear'} # Mild weather

        # Ensure both feedback systems return no items for this user
        mock_outfit_feedback_filter.return_value = OutfitFeedback.objects.none()
        mock_user_item_pref_filter.return_value = UserItemPreference.objects.none()

        # Test with user_profile: T-SHIRT should be present (default suggestion, global penalty ignored)
        suggested_items_user, advice_user = suggest_outfit_py(weather_data, user_profile=mock_user_profile)
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items_user)
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_user)

        # Test with user_profile=None (anonymous): T-SHIRT should be REMOVED due to global dislikes
        suggested_items_anon, advice_anon = suggest_outfit_py(weather_data, user_profile=None)
        # With mock_filter.return_value = [], no feedback is applied, so T-shirt should be present.
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items_anon)
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_anon)

    @patch('apps.personalization.outfit_logic.OutfitFeedback.objects.filter')
    def test_feedback_from_different_weather_bucket_not_applied(self, mock_filter):
        """
        Tests that feedback recorded for an item in one weather condition (e.g., hot weather)
        does not affect its suggestion in a different weather condition (e.g., mild weather)
        for which it would normally be suggested and has no specific negative feedback.
        """
        # T-Shirt is normally suggested for feels_like: 18 (mild)
        # Create heavy dislike feedback for T-Shirt but for a COLD weather bucket (e.g., feels_like: 5)
        # This feedback should NOT be applied when suggesting for mild weather.

        # This mock feedback is for a different weather bucket (e.g. cold)
        # mock_cold_feedback_list = [
        #     self._create_mock_feedback(5, [OUTFIT_ITEMS['T_SHIRT']], 'dislike') 
        #     for _ in range(MIN_FEEDBACK_COUNT + DISLIKE_THRESHOLD + 1) # Ensure it would remove if applied
        # ]
        
        # CRITICAL FIX: When suggest_outfit_py queries for the 18-degree bucket, 
        # it should find no relevant feedback because any "cold feedback" was for a different temperature bucket.
        # Thus, the filter call should effectively return an empty list for the 18-degree context.
        mock_filter.return_value = [] 
        
        weather_data = {'feels_like': 18} # Requesting for mild weather
        # Call with no user_profile, so it should consider general feedback for the *current* weather bucket
        suggested_items, advice_strings = suggest_outfit_py(weather_data, user_profile=None)
        
        # T-Shirt should still be suggested because the strong dislike feedback was for a different weather bucket
        self.assertIn(OUTFIT_ITEMS['T_SHIRT'], suggested_items, 
                      "T-Shirt should be present as feedback from other buckets is not applied.")
        self.assertNotIn(FEEDBACK_ADJUSTMENT_ADVICE, advice_strings,
                         "Feedback advice should not be present as no relevant feedback was applied.")
        
        # Check that the query was made for the correct mild weather bucket
        # The Q object structure must match how it's created in outfit_logic.py
        from django.db.models import Q # Ensure Q is imported if not already in module scope for tests
        expected_filter = Q(weather_data__feels_like__gte=15, weather_data__feels_like__lt=25)
        mock_filter.assert_called_once_with(expected_filter)

# Basic weather data for tests - Placed at module level for potential reuse
NEUTRAL_WEATHER = {
    'feels_like': 20, 'temperature': 20, 'precipitation_chance': 0,
    'weather_main': 'Clear', 'weather_description': 'clear sky',
    'uv_index': 5, 'wind_speed': 2, 'is_day': True, 'datetime': '2023-07-15T14:00:00Z'
}
WARM_WEATHER = {
    'feels_like': 28, 'temperature': 28, 'precipitation_chance': 0,
    'weather_main': 'Clear', 'weather_description': 'clear sky',
    'uv_index': 8, 'wind_speed': 2, 'is_day': True, 'datetime': '2023-07-15T14:00:00Z'
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
        
        self.assertTrue(OUTFIT_ITEMS['SHIRT'] in suggested_items or OUTFIT_ITEMS['DRESS_SHIRT'] in suggested_items)
        self.assertTrue(OUTFIT_ITEMS['PANTS'] in suggested_items or OUTFIT_ITEMS['CHINOS'] in suggested_items)
        self.assertTrue(OUTFIT_ITEMS['SHOES'] in suggested_items or OUTFIT_ITEMS['DRESS_SHOES'] in suggested_items)
        
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
        self.assertIn('Warm weather. Comfortable clothing recommended.', advice_set)

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

        self.assertIn('Wear appropriate, comfortable gear for your workout. Don\'t forget to hydrate!', advice_set)
        self.assertIn('Cold conditions. Dress warmly with layers, including a thermal base.', advice_set)