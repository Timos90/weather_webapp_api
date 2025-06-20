import random
import json
from pathlib import Path
from django.conf import settings # May not be strictly needed if Path(__file__) is sufficient
from django.db.models import Q
from .models import OutfitFeedback, UserItemPreference # Added UserItemPreference
from collections import defaultdict

# --- Learned Preferences Handling ---
_LEARNED_PREFERENCES = None
# Assumes outfit_logic.py is in apps/personalization/
_PREFERENCES_FILE_PATH = Path(__file__).resolve().parent / 'data' / 'learned_item_preferences.json'

# Define temperature categories and thresholds (in Celsius) - must match analyze_feedback.py
TEMP_CATEGORIES_LOGIC = {
    "cold_below_10c": lambda t: t < 10,
    "mild_10_20c": lambda t: 10 <= t < 20,
    "warm_20_30c": lambda t: 20 <= t < 30,
    "hot_above_30c": lambda t: t >= 30,
}

def get_current_temperature_category(temperature):
    if temperature is None:
        return None
    # Ensure temperature is float for comparison
    try:
        temp_float = float(temperature)
    except (ValueError, TypeError):
        return None # Or log a warning

    for category, condition in TEMP_CATEGORIES_LOGIC.items():
        if condition(temp_float):
            return category
    return None

def _load_learned_preferences():
    global _LEARNED_PREFERENCES
    if _LEARNED_PREFERENCES is not None:
        return _LEARNED_PREFERENCES

    try:
        if _PREFERENCES_FILE_PATH.exists():
            with open(_PREFERENCES_FILE_PATH, 'r') as f:
                _LEARNED_PREFERENCES = json.load(f)
                # print(f"DEBUG: Loaded preferences: {_LEARNED_PREFERENCES}") # For debugging
        else:
            # print(f"Warning: Learned preferences file not found at {_PREFERENCES_FILE_PATH}") # Or use Django logging
            _LEARNED_PREFERENCES = {} # Default to empty if not found
    except (json.JSONDecodeError, IOError) as e:
        # print(f"Error loading learned preferences: {e}") # Or use Django logging
        _LEARNED_PREFERENCES = {} # Default to empty on error
    
    # Ensure top-level keys exist to prevent KeyErrors later
    _LEARNED_PREFERENCES.setdefault('overall_item_stats', {})
    _LEARNED_PREFERENCES.setdefault('alert_specific_dislikes', {})
    _LEARNED_PREFERENCES.setdefault('temperature_range_feedback', {})
    return _LEARNED_PREFERENCES


def _get_gender_specific_values_from_key(occasion_rule_dict, key, user_gender):
    """
    Retrieves gender-specific values (e.g., clothing items) from an occasion rule.
    Combines 'all' items with items specific to the user_gender.
    """
    values = set()
    gender_specific_dict = occasion_rule_dict.get(key, {})

    if isinstance(gender_specific_dict, dict):
        values.update(gender_specific_dict.get('all', set()))
        # Normalize user_gender: defaults to 'Unspecified' if None, empty, or not in ['Man', 'Woman', 'Other']
        normalized_gender = user_gender if user_gender and user_gender in ['Man', 'Woman', 'Other'] else 'Unspecified'
        
        if normalized_gender in gender_specific_dict:
            values.update(gender_specific_dict.get(normalized_gender, set()))
        elif 'Unspecified' in gender_specific_dict: # Fallback to Unspecified if specific gender not found
             values.update(gender_specific_dict.get('Unspecified', set()))

    elif isinstance(gender_specific_dict, set): # Fallback for old structure if any part is not updated
        values.update(gender_specific_dict)
    return values

# --- Feedback Type Constants ---
FEEDBACK_TYPE_LIKE = 'like'
FEEDBACK_TYPE_DISLIKE = 'dislike'

# --- Feedback Rule Constants ---
# Minimum total feedback entries (likes+dislikes) for an item to be considered for initial feedback consideration (e.g., for 0 likes, 1 dislike rule)
MIN_FEEDBACK_COUNT = 1  
# How many more dislikes than likes to penalize an item under the initial rule
DISLIKE_THRESHOLD = 1   
# Minimum total (likes+dislikes) for ratio logic to apply
FEEDBACK_MIN_TOTAL_FOR_RATIO = 3  
# If dislike/(like+dislike) >= this (and total feedback is sufficient), penalize
FEEDBACK_DISLIKE_RATIO_THRESHOLD = 0.6  
# If an item is removed due to feedback, this advice can be added.
FEEDBACK_ADJUSTMENT_ADVICE = "Outfit suggestions adjusted based on feedback."
# Threshold for removing an item if it has at least this many dislikes under a currently active specific alert.
ALERT_SPECIFIC_DISLIKE_THRESHOLD = 1

# Maps internal outfit item constants to their string representations used in suggestions and feedback.
OUTFIT_ITEMS = {
    'ATHLETIC_SHORTS': 'athletic_shorts',
    'ATHLETIC_TOP': 'athletic_top',
    'T_SHIRT': 't_shirt',
    'LONG_SLEEVE_SHIRT': 'long_sleeve_shirt',
    'SWEATER': 'sweater',
    'FLEECE_JACKET': 'fleece_jacket',
    'JEANS': 'jeans',
    'LEGGINGS': 'leggings',
    'LIGHT_JACKET': 'light_jacket',
    'MEDIUM_JACKET': 'medium_jacket',
    'HEAVY_COAT': 'heavy_coat',
    'HIKING_BOOTS': 'hiking_boots',
    'SHORTS': 'shorts',
    'PANTS': 'pants',
    'RAINCOAT': 'raincoat',
    'UMBRELLA': 'umbrella',
    'SUNGLASSES': 'sunglasses',
    'SUN_HAT': 'sun_hat',
    'WINTER_HAT': 'winter_hat',
    'GLOVES': 'gloves',
    'SCARF': 'scarf',
    'SANDALS': 'sandals',
    'SNEAKERS': 'sneakers',
    'BOOTS': 'boots',
    'WATERPROOF_SHOES': 'waterproof_shoes',
    'WINDBREAKER': 'windbreaker',
    'BEACH_COVER_UP': 'beach_cover_up',
    'BLOUSE': 'blouse',
    'DRESS': 'dress',
    'DRESS_SHIRT': 'dress_shirt',
    'SKIRT': 'skirt',
    'SUIT_JACKET': 'suit_jacket',
    'SUIT_PANTS': 'suit_pants',
    'CARDIGAN': 'cardigan',
    'POLO_SHIRT': 'polo_shirt',
    'SWIMSUIT': 'swimsuit',
    'TANK_TOP': 'tank_top',
    'VEST': 'vest',
    'CAPRIS': 'capris',
    'THERMAL_TOP': 'thermal_top',
    'BLAZER': 'blazer',
    'FLIP_FLOPS': 'flip_flops',
    'HOODIE': 'hoodie',
    'OVERCOAT': 'overcoat',
    'TIE': 'tie',
    'CHINOS': 'chinos',
    'STYLISH_COAT': 'stylish_coat',
    'EVENING_GOWN': 'evening_gown',
    'SHAWL': 'shawl',
    'TRACK_JACKET': 'track_jacket',
    'TRACK_PANTS': 'track_pants',
    'BEANIE': 'beanie',
    'THERMAL_PANTS': 'thermal_pants',
    'WOOL_SOCKS': 'wool_socks',
    'SUN_DRESS': 'sun_dress',
    'DRESS_SHOES': 'dress_shoes',
    'RUNNING_JACKET': 'running_jacket',
    'SHIRT': 'shirt',
    'SHOES': 'shoes',
}

# --- Occasion-Based Outfit Rules ---
# Defines rules for suggesting outfits based on specific occasions.
# Each occasion can have:
#   - 'suggest_base': Core items suitable for the occasion.
#   - 'suggest_if_warm': Additional items if weather is warm.
#   - 'suggest_if_cold': Additional items if weather is cold.
#   - 'avoid': Items generally unsuitable for the occasion.
#   - 'advice': Specific advice for this occasion.
OCCASION_RULES = {
    'general': {
        'suggest_base': {},
        'suggest_if_warm': {},
        'suggest_if_cold': {},
        'avoid': {},
        'advice': ['Stay comfortable and adaptable to the weather.']
    },
    'work_office': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['PANTS']},
            'Man': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['DRESS_SHOES']},
            'Woman': {OUTFIT_ITEMS['BLOUSE']},
            'Other': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['BLOUSE']},
            'Unspecified': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['BLOUSE']}
        },
        'suggest_if_warm': {
            'Woman': {OUTFIT_ITEMS['SKIRT']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['SWEATER']},
            'Man': {OUTFIT_ITEMS['BLAZER']},
            'Woman': {OUTFIT_ITEMS['CARDIGAN'], OUTFIT_ITEMS['BLAZER']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['TANK_TOP'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['BEACH_COVER_UP'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'advice': ['Consider smart casual or business casual attire for the office.']
    },
    'casual_outing': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SNEAKERS']},
            'Woman': {OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['SUN_DRESS']},
            'Man': {OUTFIT_ITEMS['POLO_SHIRT']}
        },
        'suggest_if_warm': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SUNGLASSES']},
            'Woman': {OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['CAPRIS']},
            'Man': {OUTFIT_ITEMS['SANDALS']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['SWEATER'], OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['HOODIE']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['EVENING_GOWN'], OUTFIT_ITEMS['DRESS_SHOES']}
        },
        'advice': ['Comfortable and casual is the way to go. Adapt with layers if needed.']
    },
    'work_formal': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['DRESS_SHIRT']},
            'Man': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['TIE']},
            'Woman': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['SKIRT'], OUTFIT_ITEMS['DRESS']}
        },
        'suggest_if_warm': {},
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['OVERCOAT']}},
        'avoid': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'advice': ['Formal business attire is required. A tie is typically expected for men. Ensure a polished look.']
    },
    'casual_outing': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['SNEAKERS']}
        },
        'suggest_if_warm': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS']},
            'Woman': {OUTFIT_ITEMS['SUN_DRESS']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['SWEATER'], OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['HOODIE']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['TIE']}
        },
        'advice': ['Comfortable and casual is the way to go. Adapt with layers if needed.']
    },
    'date_night': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['PANTS']},
            'Man': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['CHINOS']},
            'Woman': {OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['SKIRT']}
        },
        'suggest_if_warm': {},
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['SWEATER']},
            'Man': {OUTFIT_ITEMS['BLAZER']},
            'Woman': {OUTFIT_ITEMS['CARDIGAN'], OUTFIT_ITEMS['STYLISH_COAT']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['BEACH_COVER_UP'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'advice': ['Dress to impress! Smart casual to semi-formal often works well. Consider the venue.']
    },
    'formal_event': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['DRESS_SHOES']},
            'Man': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['TIE']},
            'Woman': {OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['EVENING_GOWN']}
        },
        'suggest_if_warm': {},
        'suggest_if_cold': {
            'Man': {OUTFIT_ITEMS['OVERCOAT']},
            'Woman': {OUTFIT_ITEMS['STYLISH_COAT'], OUTFIT_ITEMS['SHAWL']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'advice': ['Elegant attire is required. Think gowns for women, tuxedos or dark suits for men. Formal shoes are a must.']
    },
    'sports_exercise': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SNEAKERS']},
            'Man': {OUTFIT_ITEMS['ATHLETIC_SHORTS']},
            'Woman': {OUTFIT_ITEMS['LEGGINGS']}
        },
        'suggest_if_warm': {'all': {OUTFIT_ITEMS['TANK_TOP']}, 'Woman': {OUTFIT_ITEMS['ATHLETIC_SHORTS']}},
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['TRACK_JACKET'], OUTFIT_ITEMS['RUNNING_JACKET'], OUTFIT_ITEMS['TRACK_PANTS'], OUTFIT_ITEMS['FLEECE_JACKET'], OUTFIT_ITEMS['BEANIE']}},
        'avoid': {
            'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'advice': ['Wear appropriate, comfortable gear for your workout. Don\'t forget to hydrate!']
    },
    'outdoor_activity': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['JEANS']}
        },
        'suggest_if_warm': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SUN_HAT'], OUTFIT_ITEMS['SUNGLASSES'], OUTFIT_ITEMS['SANDALS']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['FLEECE_JACKET'], OUTFIT_ITEMS['WINDBREAKER'], OUTFIT_ITEMS['BEANIE'], OUTFIT_ITEMS['GLOVES'], OUTFIT_ITEMS['HIKING_BOOTS'], OUTFIT_ITEMS['THERMAL_TOP'], OUTFIT_ITEMS['THERMAL_PANTS']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['BEACH_COVER_UP'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'advice': ['Dress for comfort and the elements. Layers are key for changing conditions. Check for specific gear if hiking.']
    },
    'beach_pool': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS']}
        },
        'suggest_if_warm': {
            'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['TANK_TOP'], OUTFIT_ITEMS['BEACH_COVER_UP'], OUTFIT_ITEMS['SUN_HAT'], OUTFIT_ITEMS['SUNGLASSES']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['SWEATER'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['WINDBREAKER']}
        },
        'avoid': {
            'all': {OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['WOOL_SOCKS'], OUTFIT_ITEMS['HIKING_BOOTS']}
        },
        'advice': ['Time for some sun and water! Pack swimwear, sunscreen, a towel, sunglasses, and a sun hat.']
    }
}

def suggest_outfit_py(weather_data: dict, user_gender: str = None, user_profile=None, occasion: str = 'general'):
    """
    Suggests an outfit based on weather data, user gender, occasion, and user profile.
    The process involves several stages:
    1. Initial suggestions based on general weather rules (temperature, precipitation, UV).
    2. Application of occasion-specific rules (from OCCASION_RULES) which can add or remove items, and protect items from subsequent removal.
    3. Fetching and applying user-specific dislikes (from UserItemPreference model - newer system for personal feedback), which take high precedence.
    4. Applying *globally learned* preferences/dislikes from historical feedback (from learned_item_preferences.json):
        a. For the current temperature category.
        b. For active weather alerts.
    5. Applying adjustments based on the legacy OutfitFeedback model (older system for global feedback).
    6. Shoe consistency logic to ensure appropriate footwear.
    7. Final refinement of advice strings to match the suggested items and remove redundant advice.

    Args:
        weather_data (dict): A dictionary containing weather information.
        user_gender (str, optional): The gender of the user ('Man', 'Woman', 'Other', 'Unspecified').
        user_profile (UserProfile, optional): The user's profile for personalized feedback.

    Returns:
        tuple: A tuple containing two lists:
               - suggested_items (list): A list of strings representing suggested clothing items.
               - advice_text (list): A list of strings representing advice based on the weather.
    """
    learned_prefs = _load_learned_preferences()
    
    suggested_items = set()
    advice_text = set()

    feels_like = weather_data.get('feels_like')
    wind_speed = weather_data.get('wind_speed')
    is_day = weather_data.get('is_day')
    weather_main = weather_data.get('weather_main')
    precipitation_chance = weather_data.get('precipitation_chance')
    uv_index = weather_data.get('uv_index')

    current_temp_category = get_current_temperature_category(feels_like)



    if user_profile and hasattr(user_profile, 'user') and user_profile.user:
        user_db_prefs = UserItemPreference.objects.filter(user=user_profile.user, preference_type='dislike')
        
        active_alerts_events = set()
        weather_alerts_data = weather_data.get('alerts', [])
        if isinstance(weather_alerts_data, list):
            for alert_detail in weather_alerts_data:
                if isinstance(alert_detail, dict) and 'event' in alert_detail:
                    active_alerts_events.add(alert_detail['event'])

        for pref in user_db_prefs:
            # General dislikes (no specific context)
            if not pref.context_temperature_category and not pref.context_alert_event:
                user_general_dislikes.add(pref.item_name)
            # Temperature-specific dislikes
            if pref.context_temperature_category and pref.context_temperature_category == current_temp_category:
                user_temp_dislikes.add(pref.item_name)
            # Alert-specific dislikes
            if pref.context_alert_event and pref.context_alert_event in active_alerts_events:
                user_alert_dislikes.add(pref.item_name)

    # 1. Determine base outfit based on temperature and gender
    # This section generates an initial set of items based on broad weather categories
    # and, if provided, the user's gender. These are foundational suggestions before
    # any personalization or feedback is applied.
    if feels_like > 28:
        suggested_items.add(OUTFIT_ITEMS['TANK_TOP'])
        suggested_items.add(OUTFIT_ITEMS['SHORTS'])
        suggested_items.add(OUTFIT_ITEMS['SANDALS'])
        if user_gender == 'Woman':
            suggested_items.add(OUTFIT_ITEMS['SKIRT'])
        advice_text.add('It\'s hot! Dress light and stay hydrated.')
    elif 22 <= feels_like <= 28:
        suggested_items.add(OUTFIT_ITEMS['T_SHIRT'])
        if user_gender == 'Woman':
            suggested_items.add(OUTFIT_ITEMS['CAPRIS'])
            suggested_items.add(OUTFIT_ITEMS['SKIRT'])
            suggested_items.add(OUTFIT_ITEMS['SANDALS'])
        else: # Man or Unspecified
            suggested_items.add(OUTFIT_ITEMS['SHORTS'])
            suggested_items.add(OUTFIT_ITEMS['SNEAKERS'])
        advice_text.add('Warm weather. Comfortable clothing recommended.')
    elif 16 <= feels_like < 22: # Corrected upper bound from TS version which was <= 21
        if user_gender == 'Woman':
            suggested_items.add(OUTFIT_ITEMS['T_SHIRT'])
            suggested_items.add(OUTFIT_ITEMS['PANTS'])
            suggested_items.add(OUTFIT_ITEMS['SNEAKERS'])
            if (wind_speed is not None and wind_speed > 4) or is_day is False or feels_like < 18:
                suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET']) # or CARDIGAN
        elif user_gender == 'Man':
            suggested_items.add(OUTFIT_ITEMS['T_SHIRT'])
            suggested_items.add(OUTFIT_ITEMS['PANTS'])
            suggested_items.add(OUTFIT_ITEMS['SNEAKERS'])
            if (wind_speed is not None and wind_speed > 4) or is_day is False or feels_like < 18:
                suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET'])
        else:
            suggested_items.add(OUTFIT_ITEMS['T_SHIRT'])
            suggested_items.add(OUTFIT_ITEMS['PANTS'])
            suggested_items.add(OUTFIT_ITEMS['SNEAKERS'])
            if (wind_speed is not None and wind_speed > 4) or is_day is False or feels_like < 18:
                suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET'])
        advice_text.add('Mild temperatures. A light layer might be useful.')
    elif 10 <= feels_like < 16:
        if user_gender == 'Woman':
            suggested_items.add(OUTFIT_ITEMS['THERMAL_TOP']) # Added
            suggested_items.add(OUTFIT_ITEMS['LONG_SLEEVE_SHIRT']) # Could be over thermal
            suggested_items.add(OUTFIT_ITEMS['PANTS'])
            outer_layer_choice = random.random()
            if outer_layer_choice < 0.3:
                suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET'])
            elif outer_layer_choice < 0.6:
                suggested_items.add(OUTFIT_ITEMS['CARDIGAN'])
            else:
                suggested_items.add(OUTFIT_ITEMS['VEST']) # Added VEST
            # Consider boots if colder end of this range or wet
            if feels_like < 12 or (precipitation_chance is not None and precipitation_chance > 30):
                suggested_items.add(OUTFIT_ITEMS['BOOTS'])
            else:
                suggested_items.add(OUTFIT_ITEMS['SNEAKERS'])
        elif user_gender == 'Man':
            suggested_items.add(OUTFIT_ITEMS['THERMAL_TOP']) # Added
            suggested_items.add(OUTFIT_ITEMS['SWEATER'])
            suggested_items.add(OUTFIT_ITEMS['PANTS'])
            jacket_choice = random.random()
            if jacket_choice < 0.35:
                suggested_items.add(OUTFIT_ITEMS['MEDIUM_JACKET'])
            elif jacket_choice < 0.7:
                suggested_items.add(OUTFIT_ITEMS['FLEECE_JACKET'])
            else: # Add VEST as an option
                suggested_items.add(OUTFIT_ITEMS['VEST'])
            suggested_items.add(OUTFIT_ITEMS['BOOTS'])
            suggested_items.add(OUTFIT_ITEMS['WINTER_HAT'])
            suggested_items.add(OUTFIT_ITEMS['GLOVES'])
            suggested_items.add(OUTFIT_ITEMS['SCARF'])
        else:
            suggested_items.add(OUTFIT_ITEMS['LONG_SLEEVE_SHIRT'])
            suggested_items.add(OUTFIT_ITEMS['PANTS'])
            suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET'])
            suggested_items.add(OUTFIT_ITEMS['SNEAKERS'])
        advice_text.add('Cool weather. Layers are a good idea.')
    elif 4 <= feels_like < 10:
        # Base items for cold weather
        suggested_items.add(OUTFIT_ITEMS['THERMAL_TOP'])
        suggested_items.add(OUTFIT_ITEMS['LONG_SLEEVE_SHIRT'])
        suggested_items.add(OUTFIT_ITEMS['PANTS'])
        suggested_items.add(OUTFIT_ITEMS['BOOTS'])
        suggested_items.add(OUTFIT_ITEMS['WINTER_HAT'])
        suggested_items.add(OUTFIT_ITEMS['SCARF'])

        # Mid-layer and Outer-layer based on gender or common choice
        if user_gender == 'Woman':
            suggested_items.add(OUTFIT_ITEMS['SWEATER']) # or FLEECE_JACKET
            if random.random() < 0.5:
                suggested_items.add(OUTFIT_ITEMS['MEDIUM_JACKET'])
            else:
                suggested_items.add(OUTFIT_ITEMS['VEST']) # Vest as an option over sweater
        elif user_gender == 'Man':
            suggested_items.add(OUTFIT_ITEMS['SWEATER']) # or FLEECE_JACKET
            if random.random() < 0.5:
                suggested_items.add(OUTFIT_ITEMS['MEDIUM_JACKET'])
            else:
                suggested_items.add(OUTFIT_ITEMS['VEST']) # Vest as an option over sweater
        else: # Neutral / Unspecified
            suggested_items.add(OUTFIT_ITEMS['SWEATER'])
            suggested_items.add(OUTFIT_ITEMS['MEDIUM_JACKET'])
        
        if OUTFIT_ITEMS['MEDIUM_JACKET'] in suggested_items or OUTFIT_ITEMS['VEST'] in suggested_items:
             if random.random() < 0.7: # High chance of gloves in cold
                suggested_items.add(OUTFIT_ITEMS['GLOVES'])

        advice_text.add('Cold conditions. Dress warmly with layers, including a thermal base.')
    elif feels_like < 4:
        suggested_items.add(OUTFIT_ITEMS['THERMAL_TOP'])
        suggested_items.add(OUTFIT_ITEMS['LONG_SLEEVE_SHIRT'])
        suggested_items.add(OUTFIT_ITEMS['SWEATER']) # Could be fleece as well
        suggested_items.add(OUTFIT_ITEMS['PANTS'])
        suggested_items.add(OUTFIT_ITEMS['HEAVY_COAT'])
        suggested_items.add(OUTFIT_ITEMS['WINTER_HAT'])
        suggested_items.add(OUTFIT_ITEMS['GLOVES'])
        suggested_items.add(OUTFIT_ITEMS['SCARF'])
        suggested_items.add(OUTFIT_ITEMS['BOOTS'])
        advice_text.add('Very cold! Bundle up with multiple warm layers, including a thermal base, hat, gloves, and scarf.')

    # 2. Apply precipitation rules
    # Adjusts suggestions based on rain or snow, adding items like raincoats, umbrellas,
    # or swapping footwear for waterproof options.
    is_raining = weather_main in ['Rain', 'Drizzle']
    is_snowing = weather_main == 'Snow'

    if is_raining or (precipitation_chance is not None and precipitation_chance > 40):
        # Check temperature before deciding on raincoat vs umbrella
        if feels_like is not None and feels_like < 30:
            # Suggest raincoat if cool enough and no other substantial jacket is already suggested
            if not any(item in suggested_items for item in [OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['MEDIUM_JACKET']]):
                suggested_items.add(OUTFIT_ITEMS['RAINCOAT'])
                advice_text.add('A raincoat is a good idea for the rain.')
            else:
                advice_text.add('Your current jacket should offer some rain protection.')
            # Also suggest an umbrella if a raincoat (or other heavy jacket) isn't the primary rain gear, or even with a raincoat for extra protection
            if not suggested_items.intersection({OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['MEDIUM_JACKET']}): # RAINCOAT might be added, so umbrella is additional
                 suggested_items.add(OUTFIT_ITEMS['UMBRELLA'])
                 if OUTFIT_ITEMS['RAINCOAT'] not in suggested_items: # Add specific advice if umbrella is main rain gear
                    advice_text.add('Consider an umbrella for the rain.')

        elif feels_like is not None and feels_like >= 30:
            # Too warm for a raincoat, suggest umbrella if no other coat provides protection
            if not any(item in suggested_items for item in [OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['MEDIUM_JACKET'], OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['WINDBREAKER']]):
                suggested_items.add(OUTFIT_ITEMS['UMBRELLA'])
                advice_text.add('It\'s warm but rainy, an umbrella is recommended.')
            else:
                advice_text.add('Your current jacket might offer some rain protection, or consider an umbrella.')
        else: # Fallback if feels_like is None, or for other conditions not explicitly handled above
            # Default to suggesting an umbrella if no other heavy protection is there
            if not suggested_items.intersection({OUTFIT_ITEMS['RAINCOAT'], OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['MEDIUM_JACKET']}):
                 suggested_items.add(OUTFIT_ITEMS['UMBRELLA'])
                 advice_text.add('Consider an umbrella for potential rain.')

        if OUTFIT_ITEMS['SANDALS'] in suggested_items:
            suggested_items.remove(OUTFIT_ITEMS['SANDALS'])
            suggested_items.add(OUTFIT_ITEMS['WATERPROOF_SHOES']) # Or SNEAKERS if WATERPROOF_SHOES not preferred
            advice_text.add('Consider waterproof shoes instead of sandals due to rain.')
        elif OUTFIT_ITEMS['SNEAKERS'] in suggested_items: # If sneakers were suggested, lean towards waterproof
            if not any(wp_shoe_type in suggested_items for wp_shoe_type in [OUTFIT_ITEMS['WATERPROOF_SHOES'], OUTFIT_ITEMS['BOOTS']]):
                 suggested_items.add(OUTFIT_ITEMS['WATERPROOF_SHOES'])
                 advice_text.add('Waterproof shoes are a good choice for rain.')
        advice_text.add('Don\'t forget rain protection!')

    if is_snowing:
        advice_text.add('Snowfall expected. Ensure your outerwear is suitable for snow.')
        if OUTFIT_ITEMS['SNEAKERS'] in suggested_items and OUTFIT_ITEMS['BOOTS'] not in suggested_items:
            suggested_items.remove(OUTFIT_ITEMS['SNEAKERS'])
            suggested_items.add(OUTFIT_ITEMS['BOOTS'])
            advice_text.add('Boots are better for snow than sneakers.')
        if OUTFIT_ITEMS['GLOVES'] not in suggested_items:
            suggested_items.add(OUTFIT_ITEMS['GLOVES'])
        if OUTFIT_ITEMS['WINTER_HAT'] not in suggested_items:
            suggested_items.add(OUTFIT_ITEMS['WINTER_HAT'])

    # 3. UV Index and Sun Protection
    # Adds sun-protective items like sunglasses and sun hats if UV index is high.
    if uv_index is not None and uv_index > 5 and is_day:
        suggested_items.add(OUTFIT_ITEMS['SUNGLASSES'])
        if feels_like > 15: # Only suggest sun hat if it's also warm enough
            suggested_items.add(OUTFIT_ITEMS['SUN_HAT'])
        advice_text.add('High UV index. Protect your skin and eyes.')

    # --- Apply Occasion-Based Rules ---
    # Moved here to apply after general weather rules and before feedback.
    items_to_remove_occasion = set()
    protected_by_occasion = set()  # Items added by occasion rules that should be less prone to removal by general feedback
    occasion_specific_rules = OCCASION_RULES.get(occasion, OCCASION_RULES['general'])

    if occasion_specific_rules:
        # Get base items
        base_items = _get_gender_specific_values_from_key(occasion_specific_rules, 'suggest_base', user_gender)
        suggested_items.update(base_items)
        protected_by_occasion.update(base_items)

        # Get temperature-specific items
        # current_temp_category is from utils.TEMPERATURE_CATEGORY_MAP_SIMPLE: 'hot_above_30c', 'warm_20_30c', 'mild_10_20c', 'cold_below_10c'
        if current_temp_category in ['warm_20_30c', 'hot_above_30c']:
            warm_items = _get_gender_specific_values_from_key(occasion_specific_rules, 'suggest_if_warm', user_gender)
            suggested_items.update(warm_items)
            protected_by_occasion.update(warm_items)
        elif current_temp_category == 'cold_below_10c':
            cold_items = _get_gender_specific_values_from_key(occasion_specific_rules, 'suggest_if_cold', user_gender)
            suggested_items.update(cold_items)
            protected_by_occasion.update(cold_items)

        # Get items to avoid for the occasion
        avoid_items_for_occasion = _get_gender_specific_values_from_key(occasion_specific_rules, 'avoid', user_gender)
        items_to_remove_occasion.update(avoid_items_for_occasion)
        
        # Add occasion-specific advice
        occasion_advice_list = occasion_specific_rules.get('advice', [])
        if isinstance(occasion_advice_list, str): # Handle single string advice
            occasion_advice_list = [occasion_advice_list]
        for adv in occasion_advice_list: # Iterate and add
            advice_text.add(adv)

    # Remove items explicitly avoided by the occasion rules.
    # This is now placed after general weather rules and occasion-specific additions,
    # but before user feedback or other refinements.
    suggested_items -= items_to_remove_occasion

    # --- APPLY USER-SPECIFIC DISLIKES (FROM UserItemPreference MODEL) ---
    # This is a critical personalization step. It uses pre-fetched user-specific dislikes:
    # - user_general_dislikes: Items the user generally dislikes.
    # - user_temp_dislikes: Items disliked by the user in the current temperature context.
    # - user_alert_dislikes: Items disliked by the user during currently active weather alerts.
    # These personal dislikes override previous suggestions. If a user has marked an item
    # for dislike in the relevant context, it's removed here.
    if user_profile and hasattr(user_profile, 'user') and user_profile.user: # Check again in case it's called without user_profile
        user_general_dislikes = set()
        user_temp_dislikes = set()
        user_alert_dislikes = set()

        items_to_remove_user_specific = set()
        # Combine all user dislike sets for efficient checking
        all_user_disliked_items = user_general_dislikes.union(user_temp_dislikes).union(user_alert_dislikes)

        for item in list(suggested_items): # Iterate over a copy
            if item in all_user_disliked_items:
                items_to_remove_user_specific.add(item)
        
        if items_to_remove_user_specific:
            # You could add a specific advice piece here if desired, e.g.:
            # advice_text.add("Suggestions adjusted based on your personal preferences.")
            suggested_items -= items_to_remove_user_specific

    # --- REFINE SUGGESTIONS BASED ON GLOBAL TEMPERATURE CATEGORY FEEDBACK (learned_prefs) ---
    # Applies *globally learned* preferences from 'learned_item_preferences.json'.
    # If, for the current temperature category, an item has a negative net_score
    # (more dislikes than likes historically), it's considered for removal.
    # This step acts on items *not* already removed by user-specific dislikes.
    if current_temp_category and learned_prefs['temperature_range_feedback'].get(current_temp_category):
        temp_feedback_for_category = learned_prefs['temperature_range_feedback'][current_temp_category]
        items_to_remove_temp = set()
        for item_val_str in list(suggested_items): # Iterate on a copy
            item_prefs_in_temp = temp_feedback_for_category.get(item_val_str)
            if item_val_str not in protected_by_occasion and item_prefs_in_temp and item_prefs_in_temp.get("net_score", 0) < 0:
                # Example: Remove if net_score is negative. Threshold can be adjusted.
                # More aggressive: item_prefs_in_temp.get("dislikes", 0) > item_prefs_in_temp.get("likes", 0)
                items_to_remove_temp.add(item_val_str)
                # advice_text.add(f"Considering feedback for {item_val_str} in this temperature.") # Optional advice
        if items_to_remove_temp:
            # advice_text.add(FEEDBACK_ADJUSTMENT_ADVICE) # Add general feedback advice if any item removed
            pass # Decided to not add specific advice for now to keep it clean
        suggested_items -= items_to_remove_temp

    # --- REFINE SUGGESTIONS BASED ON GLOBAL ALERT-SPECIFIC DISLIKES (learned_prefs) ---
    # Similar to temperature feedback, this applies *globally learned* dislikes from
    # 'learned_item_preferences.json' for items when specific weather alerts are active.
    # This also acts on items not already removed by personal user-specific dislikes.
    active_alerts_data = weather_data.get('alerts') # list of dicts with 'event'
    if isinstance(active_alerts_data, list) and active_alerts_data:
        alert_dislikes_map = learned_prefs['alert_specific_dislikes']
        items_to_remove_alert = set()
        active_alert_events = {alert.get('event') for alert in active_alerts_data if isinstance(alert, dict) and alert.get('event')}

        for alert_event_str, disliked_items_in_alert_map in alert_dislikes_map.items():
            if alert_event_str in active_alert_events:
                for item_val_str, dislike_count in disliked_items_in_alert_map.items():
                    if item_val_str not in protected_by_occasion and item_val_str in suggested_items and dislike_count >= ALERT_SPECIFIC_DISLIKE_THRESHOLD:
                        items_to_remove_alert.add(item_val_str)
                        # advice_text.add(f"Considering feedback for {item_val_str} during '{alert_event_str}'.") # Optional
        if items_to_remove_alert:
            # advice_text.add(FEEDBACK_ADJUSTMENT_ADVICE)
            pass
        suggested_items -= items_to_remove_alert

    # 4. Process Weather Alerts
    alerts = weather_data.get('alerts') # This will be a list of dicts
    if alerts and isinstance(alerts, list):
        for alert in alerts:
            event_name = alert.get('event', '').lower()
            description = alert.get('description', '').lower()
            alert_text_lower = f"{event_name} {description}"

            # Wind Alerts
            if any(kw in alert_text_lower for kw in ['wind', 'gale']):
                advice_text.add('Strong winds expected. Secure hats and loose items.')
                if OUTFIT_ITEMS['LIGHT_JACKET'] not in suggested_items and OUTFIT_ITEMS['MEDIUM_JACKET'] not in suggested_items and OUTFIT_ITEMS['HEAVY_COAT'] not in suggested_items and 10 < feels_like < 22:
                    if OUTFIT_ITEMS['LIGHT_JACKET'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET'])
                    advice_text.add('A windbreaker or light jacket is recommended due to wind.')
                if OUTFIT_ITEMS['UMBRELLA'] in suggested_items:
                    advice_text.add('Be cautious with umbrellas in strong winds; they might invert.')

            # Heat Alerts
            if any(kw in alert_text_lower for kw in ['heat', 'hot', 'sunstroke', 'hyperthermia']):
                advice_text.add('Heat advisory: Stay hydrated, seek shade, and avoid strenuous activity during peak hours.')
                # Ensure clothing is light, e.g. remove heavier items if inappropriately suggested
                if OUTFIT_ITEMS['SWEATER'] in suggested_items and feels_like > 20: suggested_items.remove(OUTFIT_ITEMS['SWEATER'])
                if OUTFIT_ITEMS['MEDIUM_JACKET'] in suggested_items and feels_like > 20: suggested_items.remove(OUTFIT_ITEMS['MEDIUM_JACKET'])

            # Cold/Snow/Ice Alerts
            if any(kw in alert_text_lower for kw in ['cold', 'frost', 'freeze', 'snow', 'ice', 'blizzard', 'winter storm', 'hypothermia']):
                advice_text.add('Cold weather/snow/ice alert: Dress in very warm layers. Watch out for slippery surfaces.')
                # Reinforce cold weather gear
                if OUTFIT_ITEMS['HEAVY_COAT'] not in suggested_items and feels_like < 4 and OUTFIT_ITEMS['HEAVY_COAT'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['HEAVY_COAT'])
                if OUTFIT_ITEMS['GLOVES'] not in suggested_items and OUTFIT_ITEMS['GLOVES'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['GLOVES'])
                if OUTFIT_ITEMS['SCARF'] not in suggested_items and OUTFIT_ITEMS['SCARF'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['SCARF'])
                if OUTFIT_ITEMS['WINTER_HAT'] not in suggested_items and OUTFIT_ITEMS['WINTER_HAT'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['WINTER_HAT'])
                if OUTFIT_ITEMS['BOOTS'] not in suggested_items and (is_snowing or 'snow' in alert_text_lower or 'ice' in alert_text_lower):
                    if OUTFIT_ITEMS['SNEAKERS'] in suggested_items: suggested_items.remove(OUTFIT_ITEMS['SNEAKERS'])
                    if OUTFIT_ITEMS['SANDALS'] in suggested_items: suggested_items.remove(OUTFIT_ITEMS['SANDALS'])
                    if OUTFIT_ITEMS['BOOTS'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['BOOTS'])

            # Rain/Flood/Thunderstorm Alerts
            if any(kw in alert_text_lower for kw in ['rain', 'flood', 'thunderstorm', 'downpour', 'deluge', 'precipitation']):
                if 'thunderstorm' in alert_text_lower:
                    advice_text.add('Thunderstorm warning: Seek sturdy shelter immediately. Avoid open areas, water, and tall objects.')
                    if OUTFIT_ITEMS['UMBRELLA'] in suggested_items:
                        suggested_items.remove(OUTFIT_ITEMS['UMBRELLA'])
                        advice_text.add('Umbrellas are NOT safe in thunderstorms; discard if previously suggested.')
                elif 'flood' in alert_text_lower:
                    advice_text.add('Flood warning: Avoid low-lying areas and waterways. Do not attempt to drive or walk through flooded areas.')
                else: # General rain
                    advice_text.add('Rain alert: Expect precipitation. Rain protection is advised.')
                
                # Ensure rain gear
                if not any(item in suggested_items for item in [OUTFIT_ITEMS['RAINCOAT'], OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['MEDIUM_JACKET']]):
                    if OUTFIT_ITEMS['RAINCOAT'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['RAINCOAT'])
                if not any(item in suggested_items for item in [OUTFIT_ITEMS['WATERPROOF_SHOES'], OUTFIT_ITEMS['BOOTS']]):
                    if OUTFIT_ITEMS['SANDALS'] in suggested_items: suggested_items.remove(OUTFIT_ITEMS['SANDALS'])
                    if OUTFIT_ITEMS['SNEAKERS'] in suggested_items: suggested_items.remove(OUTFIT_ITEMS['SNEAKERS'])
                    if OUTFIT_ITEMS['WATERPROOF_SHOES'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['WATERPROOF_SHOES'])
            
            # Fog Alerts
            if any(kw in alert_text_lower for kw in ['fog', 'visibility']):
                advice_text.add('Fog advisory: Reduced visibility expected. Exercise caution, especially if driving or cycling.')

    # 5. Wind considerations (example: add windbreaker if not already heavily layered)
    if wind_speed is not None and wind_speed > 8: # m/s, roughly > 30 km/h or 18 mph
        advice_text.add('It might be windy. A wind-resistant layer is advisable.')
        # Example: if wearing t-shirt and it's cool, suggest light jacket if not already there
        if OUTFIT_ITEMS['T_SHIRT'] in suggested_items and feels_like < 20 and not any(j in suggested_items for j in [OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['MEDIUM_JACKET'], OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['FLEECE_JACKET'], OUTFIT_ITEMS['RAINCOAT']]):
            if OUTFIT_ITEMS['LIGHT_JACKET'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['LIGHT_JACKET'])

    # Final check for shoe consistency (e.g. don't suggest sandals with heavy coat)
    if OUTFIT_ITEMS['HEAVY_COAT'] in suggested_items or OUTFIT_ITEMS['MEDIUM_JACKET'] in suggested_items:
        if OUTFIT_ITEMS['SANDALS'] in suggested_items:
            suggested_items.remove(OUTFIT_ITEMS['SANDALS'])
            if OUTFIT_ITEMS['BOOTS'] not in suggested_items:
                 if OUTFIT_ITEMS['SNEAKERS'] not in items_to_remove_occasion: suggested_items.add(OUTFIT_ITEMS['SNEAKERS']) # Default to sneakers or boots
            advice_text.add('Switched sandals to more appropriate footwear for the overall outfit.')

    # 6. Apply Feedback Adjustments (User-Specific or General)
    # --- Feedback-based Adjustments ---
    # 1. Determine weather bucket for feedback query
    # For simplicity, we'll use broad temperature categories for feels_like
    temp_bucket_filter = Q()
    if feels_like is not None:
        if feels_like < 5:
            temp_bucket_filter = Q(weather_data__feels_like__lt=5)
        elif feels_like < 15:
            temp_bucket_filter = Q(weather_data__feels_like__gte=5, weather_data__feels_like__lt=15)
        elif feels_like < 25:
            temp_bucket_filter = Q(weather_data__feels_like__gte=15, weather_data__feels_like__lt=25)
        else: # feels_like >= 25
            temp_bucket_filter = Q(weather_data__feels_like__gte=25)

    # 2. Fetch relevant feedback
    relevant_feedback = []
    if temp_bucket_filter != Q(): # Only query if we have a valid bucket
        # Consider adding weather_main to the filter for more specificity if needed
        # e.g., Q(weather_data__weather_main=weather_data.get('weather_main'))
        feedback_query_filters = temp_bucket_filter # Initial Q object, already a Q
        if user_profile:
            feedback_query_filters &= Q(user_profile=user_profile)
        relevant_feedback = OutfitFeedback.objects.filter(feedback_query_filters)
    
    # 3. Aggregate feedback for items
    item_feedback_counts = {} # General for temp bucket: item_name -> {'likes': X, 'dislikes': Y}
    # For feedback specific to currently active alerts:
    # item_name -> alert_event_str -> {'likes': N, 'dislikes': M}
    alert_context_item_feedback = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    # Determine current active alert events from the input weather_data
    current_active_alert_events = set()
    raw_current_alerts = weather_data.get('alerts')
    if isinstance(raw_current_alerts, list):
        for alert_obj in raw_current_alerts:
            if isinstance(alert_obj, dict) and 'event' in alert_obj and isinstance(alert_obj['event'], str):
                current_active_alert_events.add(alert_obj['event'])

    for feedback_entry in relevant_feedback:
        items_in_feedback = []
        if isinstance(feedback_entry.suggested_outfit, dict):
            raw_items = feedback_entry.suggested_outfit.get('suggested_items', [])
            if isinstance(raw_items, list):
                items_in_feedback = raw_items
        
        for item_name in items_in_feedback:
            # Ensure item_name from feedback is a valid, non-empty string before processing
            if not (isinstance(item_name, str) and item_name):
                continue

            # Initialize if item_name is new
            if item_name not in item_feedback_counts:
                item_feedback_counts[item_name] = {'likes': 0, 'dislikes': 0}


            # Increment counts for general feedback (temperature bucket)
            if feedback_entry.feedback_type == FEEDBACK_TYPE_LIKE:
                item_feedback_counts[item_name]['likes'] += 1
            elif feedback_entry.feedback_type == FEEDBACK_TYPE_DISLIKE:
                item_feedback_counts[item_name]['dislikes'] += 1
            
            # NEW: Increment counts for alert-specific context if applicable
            feedback_entry_alerts_raw = feedback_entry.weather_data.get('alerts')
            if isinstance(feedback_entry_alerts_raw, list) and current_active_alert_events:
                for fb_alert_obj in feedback_entry_alerts_raw:
                    if isinstance(fb_alert_obj, dict) and 'event' in fb_alert_obj:
                        fb_alert_event = fb_alert_obj['event']
                        # If this feedback entry's alert is one of the currently active ones
                        if fb_alert_event in current_active_alert_events:
                            # Aggregate feedback for this item under this specific active alert event
                            if feedback_entry.feedback_type == FEEDBACK_TYPE_LIKE:
                                alert_context_item_feedback[item_name][fb_alert_event]['likes'] += 1
                            elif feedback_entry.feedback_type == FEEDBACK_TYPE_DISLIKE:
                                alert_context_item_feedback[item_name][fb_alert_event]['dislikes'] += 1
            

    # 4. Apply adjustments (penalize disliked items)
    items_removed_by_feedback = False

    # --- NEW: First, apply adjustments based on feedback for CURRENTLY ACTIVE ALERTS ---
    if current_active_alert_events:
        items_to_remove_for_alert_context = set()
        for item_to_check in list(suggested_items): # Iterate over a copy of current suggestions
            for active_alert_event in current_active_alert_events:
                # Check dislikes for this item under this specific active alert
                dislikes_for_item_under_alert = alert_context_item_feedback.get(item_to_check, {}).get(active_alert_event, {}).get('dislikes', 0)
                
                if dislikes_for_item_under_alert >= ALERT_SPECIFIC_DISLIKE_THRESHOLD:
                    items_to_remove_for_alert_context.add(item_to_check)
                    # Optional: Add more specific advice here if desired, e.g., 
                    # advice_text.add(f"Note: '{item_to_check}' was reconsidered due to feedback during '{active_alert_event}'.")
                    break # Item marked for removal due to this alert, move to next item
        
        if items_to_remove_for_alert_context:
            for item_to_remove in items_to_remove_for_alert_context:
                if item_to_remove in suggested_items and item_to_remove not in protected_by_occasion:
                    suggested_items.remove(item_to_remove)
                    items_removed_by_feedback = True

    # --- THEN, apply general feedback adjustments (temperature bucket) to remaining items ---
    # Iterate over a copy of (potentially already modified) suggested_items for safe removal
    for item_to_check in list(suggested_items):
        if item_to_check in item_feedback_counts:
            counts = item_feedback_counts[item_to_check]
            likes = counts['likes']
            dislikes = counts['dislikes']
            total_feedback = likes + dislikes

            # Rule 1: Direct dislike threshold (often for low total feedback counts)
            # If an item has at least MIN_FEEDBACK_COUNT and dislikes exceed likes by DISLIKE_THRESHOLD
            if item_to_check not in protected_by_occasion and total_feedback >= MIN_FEEDBACK_COUNT and dislikes >= (likes + DISLIKE_THRESHOLD):
                if item_to_check in suggested_items: # Ensure item is still in the set before removing
                    suggested_items.remove(item_to_check)
                    items_removed_by_feedback = True
                    continue # Item removed, no need to check Rule 2 for this item

            # Rule 2: Ratio-based removal (for items with more established feedback)
            # Only apply if not already removed by Rule 1 and if feedback count is sufficient for ratio analysis
            if total_feedback >= FEEDBACK_MIN_TOTAL_FOR_RATIO:
                # total_feedback is already checked to be >= FEEDBACK_MIN_TOTAL_FOR_RATIO (which should be > 0)
                dislike_ratio = dislikes / total_feedback if total_feedback > 0 else 0
                if item_to_check not in protected_by_occasion and dislike_ratio >= FEEDBACK_DISLIKE_RATIO_THRESHOLD:
                    if item_to_check in suggested_items: # Ensure item is still in the set
                        suggested_items.remove(item_to_check)
                        items_removed_by_feedback = True
                        # No continue needed here, as it's the last check for this item.

    
    # Add advice if items were removed due to feedback
    if items_removed_by_feedback:
        advice_text.add(FEEDBACK_ADJUSTMENT_ADVICE)

    # --- REFINE BASED ON OVERALL ITEM STATS (NET SCORE) - Conservative Approach ---
    # Only remove if an item is very disliked overall and not essential.
    # This part is kept minimal for now to avoid over-complication.
    overall_stats = learned_prefs['overall_item_stats']
    items_to_remove_overall = set()
    VERY_LOW_NET_SCORE_THRESHOLD = -5 # Example threshold

    # Create a copy for safe iteration while modifying
    current_suggested_items_copy = list(suggested_items)

    for item_val_str in current_suggested_items_copy:
        item_stat = overall_stats.get(item_val_str)
        if item_val_str not in protected_by_occasion and item_stat and item_stat.get("net_score", 0) < VERY_LOW_NET_SCORE_THRESHOLD:
            # Add more sophisticated logic here if needed to check if item is "critical"
            # For now, if it's very disliked, and suggested, consider removing.
            # Example: Don't remove 'heavy_coat' if feels_like < 0, even if disliked.
            is_critical = False # Placeholder for critical item check
            if item_val_str == OUTFIT_ITEMS['HEAVY_COAT'] and feels_like is not None and feels_like < 4:
                is_critical = True
            elif item_val_str == OUTFIT_ITEMS['RAINCOAT'] and weather_data.get('weather_main') in ['Rain', 'Drizzle']:
                is_critical = True
            
            if not is_critical:
                items_to_remove_overall.add(item_val_str)
                # advice_text.add(f"Considering overall feedback for {item_val_str}.") # Optional
    
    if items_to_remove_overall:
        # advice_text.add(FEEDBACK_ADJUSTMENT_ADVICE)
        pass 
    suggested_items -= items_to_remove_overall


    # --- Shoe Consistency Logic ---
    # Ensure only one appropriate pair of shoes is suggested using a priority system.
    ALL_SHOE_TYPES = {
        OUTFIT_ITEMS['HIKING_BOOTS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['SNEAKERS'],
        OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['WATERPROOF_SHOES'], OUTFIT_ITEMS['FLIP_FLOPS'],
        OUTFIT_ITEMS['DRESS_SHOES'], OUTFIT_ITEMS['SHOES']
    }
    current_shoes_in_suggestion = suggested_items.intersection(ALL_SHOE_TYPES)

    if len(current_shoes_in_suggestion) > 1:
        preferred_shoe = None

        # 1. Determine the pool of candidate shoes. Occasion-protected shoes get priority.
        occasion_protected_shoes = current_shoes_in_suggestion.intersection(protected_by_occasion)
        candidate_shoes = occasion_protected_shoes if occasion_protected_shoes else current_shoes_in_suggestion

        # 2. Define shoe priority order based on context.
        shoe_priority = [
            OUTFIT_ITEMS['DRESS_SHOES'], OUTFIT_ITEMS['WATERPROOF_SHOES'], OUTFIT_ITEMS['BOOTS'], 
            OUTFIT_ITEMS['HIKING_BOOTS'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['SANDALS'],
            OUTFIT_ITEMS['FLIP_FLOPS'], OUTFIT_ITEMS['SHOES']
        ]

        is_raining = weather_data.get('weather_main') in ['Rain', 'Drizzle', 'Thunderstorm']
        is_snowing = weather_data.get('weather_main') == 'Snow'
        is_warm = current_temp_category in ['hot_above_30c', 'warm_20_30c']
        is_formal = occasion in ['formal_event', 'work_formal']
        is_sports = occasion == 'sports_exercise'
        is_casual_warm = occasion == 'casual_outing' and is_warm

        # Dynamically adjust priority based on context
        if is_snowing:
            shoe_priority = [OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['HIKING_BOOTS']] + [s for s in shoe_priority if s not in [OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['HIKING_BOOTS']]]
        elif is_raining:
            shoe_priority = [OUTFIT_ITEMS['WATERPROOF_SHOES']] + [s for s in shoe_priority if s != OUTFIT_ITEMS['WATERPROOF_SHOES']]
        elif is_casual_warm:
            shoe_priority = [OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS'], OUTFIT_ITEMS['SNEAKERS']] + [s for s in shoe_priority if s not in [OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS'], OUTFIT_ITEMS['SNEAKERS']]]
        elif is_warm:
            shoe_priority = [OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS']] + [s for s in shoe_priority if s not in [OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS']]]
        elif is_formal:
            shoe_priority = [OUTFIT_ITEMS['DRESS_SHOES']] + [s for s in shoe_priority if s != OUTFIT_ITEMS['DRESS_SHOES']]
        elif is_sports:
            shoe_priority = [OUTFIT_ITEMS['SNEAKERS']] + [s for s in shoe_priority if s != OUTFIT_ITEMS['SNEAKERS']]

        # 3. Find the highest priority shoe present in the candidate shoes
        for shoe in shoe_priority:
            if shoe in candidate_shoes:
                preferred_shoe = shoe
                break
        
        # 4. If no preferred shoe was found from the priority list (e.g., candidates were not in the list),
        #    fall back to picking the first one from the candidates alphabetically.
        if not preferred_shoe and candidate_shoes:
            preferred_shoe = sorted(list(candidate_shoes))[0]

        # 5. If a preferred shoe is found, remove all others from the main suggestion list.
        if preferred_shoe:
            shoes_to_remove = current_shoes_in_suggestion - {preferred_shoe}
            suggested_items.difference_update(shoes_to_remove)

    # --- Refine advice strings based on final suggested items ---
    final_advice = list(advice_text)

    advice_item_dependencies = {
        OUTFIT_ITEMS['WATERPROOF_SHOES']: [
            'Consider waterproof shoes instead of sandals due to rain.',
            'Waterproof shoes are a good choice for rain.'
        ]
    }

    for item_value, related_advice_strings in advice_item_dependencies.items():
        if item_value not in suggested_items:
            for specific_advice in related_advice_strings:
                if specific_advice in final_advice:
                    final_advice.remove(specific_advice)
    
    # Correctly indented return statement
    return list(suggested_items), final_advice
