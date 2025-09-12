import random
import json
from pathlib import Path
from django.conf import settings
from django.db.models import Q
from apps.user.models import UserProfile
from .models import OutfitFeedback, UserItemPreference
from collections import defaultdict

# --- Learned Preferences Handling ---
_LEARNED_PREFERENCES = None
_PREFERENCES_FILE_PATH = Path(__file__).resolve().parent / 'data' / 'learned_item_preferences.json'

# --- Temperature Categories ---
TEMP_CATEGORIES_LOGIC = {
    "cold_below_10c": lambda t: t < 10,
    "mild_10_20c": lambda t: 10 <= t < 20,
    "warm_20_30c": lambda t: 20 <= t < 30,
    "hot_above_30c": lambda t: t >= 30,
}

def get_current_temperature_category(temperature):
    if temperature is None:
        return None
    try:
        temp_float = float(temperature)
    except (ValueError, TypeError):
        return None
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
        else:
            _LEARNED_PREFERENCES = {}
    except (json.JSONDecodeError, IOError):
        _LEARNED_PREFERENCES = {}
    _LEARNED_PREFERENCES.setdefault('overall_item_stats', {})
    _LEARNED_PREFERENCES.setdefault('alert_specific_dislikes', {})
    _LEARNED_PREFERENCES.setdefault('temperature_range_feedback', {})
    return _LEARNED_PREFERENCES

def _get_gender_specific_values_from_key(occasion_rule_dict, key, user_gender):
    values = set()
    gender_specific_dict = occasion_rule_dict.get(key, {})
    if isinstance(gender_specific_dict, dict):
        values.update(gender_specific_dict.get('all', set()))
        normalized_gender = user_gender if user_gender and user_gender in ['Man', 'Woman', 'Other'] else 'Unspecified'
        if normalized_gender in gender_specific_dict:
            values.update(gender_specific_dict.get(normalized_gender, set()))
        elif 'Unspecified' in gender_specific_dict:
             values.update(gender_specific_dict.get('Unspecified', set()))
    elif isinstance(gender_specific_dict, set):
        values.update(gender_specific_dict)
    return values

# --- Constants ---
FEEDBACK_TYPE_LIKE = 'like'
FEEDBACK_TYPE_DISLIKE = 'dislike'
MIN_FEEDBACK_COUNT = 1
DISLIKE_THRESHOLD = 1
FEEDBACK_MIN_TOTAL_FOR_RATIO = 3
FEEDBACK_DISLIKE_RATIO_THRESHOLD = 0.6
FEEDBACK_ADJUSTMENT_ADVICE = "Outfit suggestions adjusted based on feedback."
ALERT_SPECIFIC_DISLIKE_THRESHOLD = 1

OUTFIT_ITEMS = {
    'ATHLETIC_SHORTS': 'athletic_shorts', 'ATHLETIC_TOP': 'athletic_top', 'T_SHIRT': 't_shirt',
    'LONG_SLEEVE_SHIRT': 'long_sleeve_shirt', 'SWEATER': 'sweater', 'FLEECE_JACKET': 'fleece_jacket',
    'JEANS': 'jeans', 'LEGGINGS': 'leggings', 'LIGHT_JACKET': 'light_jacket', 'MEDIUM_JACKET': 'medium_jacket',
    'HEAVY_COAT': 'heavy_coat', 'HIKING_BOOTS': 'hiking_boots', 'SHORTS': 'shorts', 'PANTS': 'pants',
    'RAINCOAT': 'raincoat', 'UMBRELLA': 'umbrella', 'SUNGLASSES': 'sunglasses', 'SUN_HAT': 'sun_hat',
    'WINTER_HAT': 'winter_hat', 'GLOVES': 'gloves', 'SCARF': 'scarf', 'SANDALS': 'sandals',
    'SNEAKERS': 'sneakers', 'BOOTS': 'boots', 'WATERPROOF_SHOES': 'waterproof_shoes',
    'WINDBREAKER': 'windbreaker', 'BEACH_COVER_UP': 'beach_cover_up', 'BLOUSE': 'blouse',
    'DRESS': 'dress', 'DRESS_SHIRT': 'dress_shirt', 'SKIRT': 'skirt', 'SUIT_JACKET': 'suit_jacket',
    'SUIT_PANTS': 'suit_pants', 'CARDIGAN': 'cardigan', 'POLO_SHIRT': 'polo_shirt',
    'SWIMSUIT': 'swimsuit', 'TANK_TOP': 'tank_top', 'VEST': 'vest', 'CAPRIS': 'capris',
    'THERMAL_TOP': 'thermal_top', 'BLAZER': 'blazer', 'FLIP_FLOPS': 'flip_flops', 'HOODIE': 'hoodie',
    'OVERCOAT': 'overcoat', 'TIE': 'tie', 'CHINOS': 'chinos', 'STYLISH_COAT': 'stylish_coat',
    'EVENING_GOWN': 'evening_gown', 'SHAWL': 'shawl', 'TRACK_JACKET': 'track_jacket',
    'TRACK_PANTS': 'track_pants', 'BEANIE': 'beanie', 'THERMAL_PANTS': 'thermal_pants',
    'WOOL_SOCKS': 'wool_socks', 'SUN_DRESS': 'sun_dress', 'DRESS_SHOES': 'dress_shoes',
    'RUNNING_JACKET': 'running_jacket', 'SHIRT': 'shirt', 'SHOES': 'shoes',
}

ITEM_CATEGORIES = {
    # Base Layer Tops
    OUTFIT_ITEMS['T_SHIRT']: {'category': 'base_top', 'gender': 'all'},
    OUTFIT_ITEMS['LONG_SLEEVE_SHIRT']: {'category': 'base_top', 'gender': 'all'},
    OUTFIT_ITEMS['DRESS_SHIRT']: {'category': 'base_top', 'gender': 'Man'},
    OUTFIT_ITEMS['BLOUSE']: {'category': 'base_top', 'gender': 'Woman'},
    OUTFIT_ITEMS['POLO_SHIRT']: {'category': 'base_top', 'gender': 'Man'},
    OUTFIT_ITEMS['TANK_TOP']: {'category': 'base_top', 'gender': 'all'},
    OUTFIT_ITEMS['ATHLETIC_TOP']: {'category': 'base_top', 'gender': 'all'},
    OUTFIT_ITEMS['THERMAL_TOP']: {'category': 'base_top', 'gender': 'all'},
    OUTFIT_ITEMS['SHIRT']: {'category': 'base_top', 'gender': 'all'},

    # Bottoms
    OUTFIT_ITEMS['PANTS']: {'category': 'bottom', 'gender': 'all'},
    OUTFIT_ITEMS['JEANS']: {'category': 'bottom', 'gender': 'all'},
    OUTFIT_ITEMS['SHORTS']: {'category': 'bottom', 'gender': 'all'},
    OUTFIT_ITEMS['ATHLETIC_SHORTS']: {'category': 'bottom', 'gender': 'all'},
    OUTFIT_ITEMS['SUIT_PANTS']: {'category': 'bottom', 'gender': 'Man'},
    OUTFIT_ITEMS['SKIRT']: {'category': 'bottom', 'gender': 'Woman'},
    OUTFIT_ITEMS['LEGGINGS']: {'category': 'bottom', 'gender': 'Woman'},
    OUTFIT_ITEMS['CAPRIS']: {'category': 'bottom', 'gender': 'Woman'},
    OUTFIT_ITEMS['CHINOS']: {'category': 'bottom', 'gender': 'Man'},
    OUTFIT_ITEMS['TRACK_PANTS']: {'category': 'bottom', 'gender': 'all'},
    OUTFIT_ITEMS['THERMAL_PANTS']: {'category': 'bottom', 'gender': 'all'},

    # Mid-layer
    OUTFIT_ITEMS['SWEATER']: {'category': 'mid_layer', 'gender': 'all'},
    OUTFIT_ITEMS['HOODIE']: {'category': 'mid_layer', 'gender': 'all'},
    OUTFIT_ITEMS['CARDIGAN']: {'category': 'mid_layer', 'gender': 'Woman'},
    OUTFIT_ITEMS['FLEECE_JACKET']: {'category': 'mid_layer', 'gender': 'all'},
    OUTFIT_ITEMS['VEST']: {'category': 'mid_layer', 'gender': 'all'},
    OUTFIT_ITEMS['SUIT_JACKET']: {'category': 'mid_layer', 'base_temp': 'mild'},

    # Outer Layer
    OUTFIT_ITEMS['LIGHT_JACKET']: {'category': 'outer_layer', 'base_temp': 'mild'},
    OUTFIT_ITEMS['MEDIUM_JACKET']: {'category': 'outer_layer', 'base_temp': 'cold'},
    OUTFIT_ITEMS['HEAVY_COAT']: {'category': 'outer_layer', 'base_temp': 'freezing'},
    OUTFIT_ITEMS['RAINCOAT']: {'category': 'outer_layer', 'weather': 'rain'},
    OUTFIT_ITEMS['WINDBREAKER']: {'category': 'outer_layer', 'weather': 'wind'},
    OUTFIT_ITEMS['BLAZER']: {'category': 'outer_layer', 'base_temp': 'mild'},
    OUTFIT_ITEMS['OVERCOAT']: {'category': 'outer_layer', 'base_temp': 'cold'},
    OUTFIT_ITEMS['STYLISH_COAT']: {'category': 'outer_layer', 'base_temp': 'cold'},
    OUTFIT_ITEMS['TRACK_JACKET']: {'category': 'outer_layer', 'base_temp': 'mild'},
    OUTFIT_ITEMS['RUNNING_JACKET']: {'category': 'outer_layer', 'base_temp': 'mild'},

    # Dresses / Full Body
    OUTFIT_ITEMS['DRESS']: {'category': 'full_body', 'gender': 'Woman'},
    OUTFIT_ITEMS['EVENING_GOWN']: {'category': 'full_body', 'gender': 'Woman'},
    OUTFIT_ITEMS['SUN_DRESS']: {'category': 'full_body', 'gender': 'Woman', 'daytime': True},
    OUTFIT_ITEMS['SWIMSUIT']: {'category': 'full_body', 'gender': 'all'},

    # Shoes
    OUTFIT_ITEMS['SNEAKERS']: {'category': 'shoes', 'style': 'casual'},
    OUTFIT_ITEMS['BOOTS']: {'category': 'shoes', 'style': 'casual', 'weather': 'cold'},
    OUTFIT_ITEMS['SANDALS']: {'category': 'shoes', 'style': 'casual', 'weather': 'warm'},
    OUTFIT_ITEMS['DRESS_SHOES']: {'category': 'shoes', 'style': 'formal'},
    OUTFIT_ITEMS['HIKING_BOOTS']: {'category': 'shoes', 'style': 'outdoor'},
    OUTFIT_ITEMS['WATERPROOF_SHOES']: {'category': 'shoes', 'style': 'casual', 'weather': 'rain'},
    OUTFIT_ITEMS['FLIP_FLOPS']: {'category': 'shoes', 'style': 'beach'},
    OUTFIT_ITEMS['SHOES']: {'category': 'shoes', 'style': 'generic'},

    # Accessories
    OUTFIT_ITEMS['SUNGLASSES']: {'category': 'accessory', 'daytime': True},
    OUTFIT_ITEMS['SUN_HAT']: {'category': 'accessory', 'daytime': True},
    OUTFIT_ITEMS['WINTER_HAT']: {'category': 'accessory', 'weather': 'cold'},
    OUTFIT_ITEMS['BEANIE']: {'category': 'accessory', 'weather': 'cold'},
    OUTFIT_ITEMS['GLOVES']: {'category': 'accessory', 'weather': 'cold'},
    OUTFIT_ITEMS['SCARF']: {'category': 'accessory', 'weather': 'cold'},
    OUTFIT_ITEMS['UMBRELLA']: {'category': 'accessory', 'weather': 'rain'},
    OUTFIT_ITEMS['TIE']: {'category': 'accessory', 'gender': 'Man'},
    OUTFIT_ITEMS['SHAWL']: {'category': 'accessory', 'gender': 'Woman'},
    OUTFIT_ITEMS['WOOL_SOCKS']: {'category': 'accessory', 'weather': 'cold'},
    OUTFIT_ITEMS['BEACH_COVER_UP']: {'category': 'accessory'},
}

OCCASION_RULES = {
    'general': {
        'suggest_base': {}, 'suggest_if_warm': {}, 'suggest_if_cold': {}, 'avoid': {},
        'advice': ['Stay comfortable and adaptable to the weather.']
    },
    'hot_weather': {
        'advice': ['Hot weather. Stay hydrated and wear light, breathable clothing.']
    },
    'cold_weather': {
        'advice': ['Cold conditions. Dress warmly with layers, including a thermal base.']
    },
    'work_office': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['PANTS']},
            'Man': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['DRESS_SHOES']},
            'Woman': {OUTFIT_ITEMS['BLOUSE']},
            'Unspecified': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['BLOUSE']}
        },
        'suggest_if_warm': {
            'Man': {OUTFIT_ITEMS['POLO_SHIRT'], OUTFIT_ITEMS['CHINOS']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['SWEATER']},
            'Man': {OUTFIT_ITEMS['BLAZER']},
            'Woman': {OUTFIT_ITEMS['CARDIGAN'], OUTFIT_ITEMS['BLAZER']}
        },
        'avoid': {'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['TANK_TOP'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}},
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
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['SWEATER'], OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['HOODIE']}},
        'avoid': {'all': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['EVENING_GOWN'], OUTFIT_ITEMS['DRESS_SHOES']}},
        'advice': ['Comfortable and casual is the way to go. Adapt with layers if needed.']
    },
    'work_formal': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['DRESS_SHIRT']},
            'Man': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['TIE']},
            'Woman': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['SKIRT'], OUTFIT_ITEMS['DRESS']}
        },
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['OVERCOAT']}},
        'avoid': {'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}},
        'advice': ['Formal business attire is required. A tie is typically expected for men. Ensure a polished look.']
    },
    'date_night': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['PANTS']},
            'Man': {OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['CHINOS']},
            'Woman': {OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['SKIRT']}
        },
        'suggest_if_cold': {
            'all': {OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['SWEATER']},
            'Man': {OUTFIT_ITEMS['BLAZER']},
            'Woman': {OUTFIT_ITEMS['CARDIGAN'], OUTFIT_ITEMS['STYLISH_COAT']}
        },
        'avoid': {'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}},
        'advice': ['Dress to impress! Smart casual to semi-formal often works well. Consider the venue.']
    },
    'formal_event': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['DRESS_SHOES']},
            'Man': {OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['SUIT_PANTS'], OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['TIE']},
            'Woman': {OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['EVENING_GOWN']}
        },
        'suggest_if_cold': {
            'Man': {OUTFIT_ITEMS['OVERCOAT']},
            'Woman': {OUTFIT_ITEMS['STYLISH_COAT'], OUTFIT_ITEMS['SHAWL']}
        },
        'avoid': {'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['ATHLETIC_SHORTS'], OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['FLIP_FLOPS']}},
        'advice': ['Elegant attire is required. Think gowns for women, tuxedos or dark suits for men. Formal shoes are a must.']
    },
    'sports_exercise': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['ATHLETIC_TOP'], OUTFIT_ITEMS['SNEAKERS']},
            'Man': {OUTFIT_ITEMS['ATHLETIC_SHORTS']},
            'Woman': {OUTFIT_ITEMS['LEGGINGS']}
        },
        'suggest_if_warm': {'all': {OUTFIT_ITEMS['TANK_TOP']}, 'Woman': {OUTFIT_ITEMS['ATHLETIC_SHORTS']}},
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['TRACK_JACKET'], OUTFIT_ITEMS['RUNNING_JACKET'], OUTFIT_ITEMS['TRACK_PANTS'], OUTFIT_ITEMS['FLEECE_JACKET'], OUTFIT_ITEMS['BEANIE'], OUTFIT_ITEMS['THERMAL_TOP']}},
        'avoid': {'all': {OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['FLIP_FLOPS']}},
        'advice': ["Wear appropriate, comfortable gear for your workout. Don't forget to hydrate!"]
    },
    'outdoor_activity': {
        'suggest_base': {
            'all': {OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['SNEAKERS'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['JEANS']}
        },
        'suggest_if_warm': {'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['SUN_HAT'], OUTFIT_ITEMS['SUNGLASSES'], OUTFIT_ITEMS['SANDALS']}},
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['FLEECE_JACKET'], OUTFIT_ITEMS['WINDBREAKER'], OUTFIT_ITEMS['BEANIE'], OUTFIT_ITEMS['GLOVES'], OUTFIT_ITEMS['HIKING_BOOTS'], OUTFIT_ITEMS['THERMAL_TOP'], OUTFIT_ITEMS['THERMAL_PANTS']}},
        'avoid': {'all': {OUTFIT_ITEMS['DRESS'], OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['BLOUSE'], OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['FLIP_FLOPS']}},
        'advice': ['Dress for comfort and the elements. Layers are key for changing conditions. Check for specific gear if hiking.']
    },
    'beach_pool': {
        'suggest_base': {'all': {OUTFIT_ITEMS['SWIMSUIT'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['FLIP_FLOPS']}},
        'suggest_if_warm': {'all': {OUTFIT_ITEMS['SHORTS'], OUTFIT_ITEMS['TANK_TOP'], OUTFIT_ITEMS['BEACH_COVER_UP'], OUTFIT_ITEMS['SUN_HAT'], OUTFIT_ITEMS['SUNGLASSES']}},
        'suggest_if_cold': {'all': {OUTFIT_ITEMS['SWEATER'], OUTFIT_ITEMS['HOODIE'], OUTFIT_ITEMS['LIGHT_JACKET'], OUTFIT_ITEMS['WINDBREAKER']}},
        'avoid': {'all': {OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['JEANS'], OUTFIT_ITEMS['SUIT_JACKET'], OUTFIT_ITEMS['DRESS_SHIRT'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['TIE'], OUTFIT_ITEMS['WOOL_SOCKS'], OUTFIT_ITEMS['HIKING_BOOTS']}},
        'advice': ['Time for some sun and water! Pack swimwear, sunscreen, a towel, sunglasses, and a sun hat.']
    }
}
def suggest_outfit_py(weather_data: dict, user_gender: str = None, occasion: str = 'general', user_id: int = None):
    # --- Initialization ---
    if not weather_data:
        return [], ['Weather data not available.']

    suggested_items = set()
    advice_text = set()
    protected_by_occasion = set()

    # --- Weather and Context Variables ---
    feels_like = weather_data.get('feels_like')
    wind_speed = weather_data.get('wind_speed')
    weather_main = weather_data.get('weather_main')
    precipitation_chance = weather_data.get('precipitation_chance')
    uv_index = weather_data.get('uv_index')
    alerts = weather_data.get('alerts', [])
    current_temp_category = get_current_temperature_category(feels_like)

    # --- User-Specific Data Loading ---
    user_general_dislikes, user_temp_dislikes, user_alert_dislikes = set(), set(), set()
    if user_id:
        try:
            user_profile = UserProfile.objects.get(user_id=user_id)
            if not user_gender and user_profile.gender:
                user_gender = user_profile.get_gender_display()
            
            # Fetch all relevant dislikes in fewer queries
            all_prefs = UserItemPreference.objects.filter(user=user_profile.user, preference_type='dislike')
            
            active_alert_events = {alert.get('event') for alert in alerts if alert.get('event')}
            
            for pref in all_prefs:
                if pref.context_alert_event and pref.context_alert_event in active_alert_events:
                    user_alert_dislikes.add(pref.item_name)
                elif pref.context_temperature_category and pref.context_temperature_category == current_temp_category:
                    user_temp_dislikes.add(pref.item_name)
                elif not pref.context_alert_event and not pref.context_temperature_category:
                    user_general_dislikes.add(pref.item_name)

        except UserProfile.DoesNotExist:
            pass # No user profile, continue with no user-specific dislikes

    # --- 1. Initial Suggestions Based on General Weather ---
    if feels_like is not None:
        if feels_like >= 30:
            advice_text.update(OCCASION_RULES['hot_weather']['advice'])
            suggested_items.add(OUTFIT_ITEMS['TANK_TOP'])
            suggested_items.add(OUTFIT_ITEMS['SANDALS'])
            suggested_items.add(OUTFIT_ITEMS['SHORTS'])
        if feels_like >= 22:
            suggested_items.update({OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['SHORTS']})
        elif 15 <= feels_like < 22:
            suggested_items.update({OUTFIT_ITEMS['T_SHIRT'], OUTFIT_ITEMS['PANTS']})
        elif 10 <= feels_like < 15:
            suggested_items.update({OUTFIT_ITEMS['LONG_SLEEVE_SHIRT'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['LIGHT_JACKET']})
        elif 4 <= feels_like < 10:
            suggested_items.update({OUTFIT_ITEMS['SWEATER'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['MEDIUM_JACKET'], OUTFIT_ITEMS['WINTER_HAT'], OUTFIT_ITEMS['SCARF']})
        else: # < 4
            suggested_items.update({OUTFIT_ITEMS['HEAVY_COAT'], OUTFIT_ITEMS['PANTS'], OUTFIT_ITEMS['WINTER_HAT'], OUTFIT_ITEMS['GLOVES'], OUTFIT_ITEMS['SCARF'], OUTFIT_ITEMS['BOOTS']})

    if 'rain' in (weather_main or '').lower() or (precipitation_chance or 0) > 50:
        suggested_items.add(OUTFIT_ITEMS['RAINCOAT'])
        suggested_items.add(OUTFIT_ITEMS['UMBRELLA'])
        suggested_items.add(OUTFIT_ITEMS['WATERPROOF_SHOES'])
        advice_text.add('Rain is likely. An umbrella or raincoat is a good idea.')
    if (wind_speed or 0) > 10:
        suggested_items.add(OUTFIT_ITEMS['WINDBREAKER'])
    if (uv_index or 0) >= 7:
        suggested_items.update({OUTFIT_ITEMS['SUN_HAT'], OUTFIT_ITEMS['SUNGLASSES']})

    # --- 2. Apply Occasion-Based Rules ---
    occasion_key = occasion.lower().replace(" ", "_") if occasion else 'general'
    occasion_rules = OCCASION_RULES.get(occasion_key, OCCASION_RULES['general'])
    
    # --- Add weather-based advice ---
    if current_temp_category == 'cold_below_10c':
        advice_text.update(OCCASION_RULES['cold_weather']['advice'])
    elif current_temp_category == 'hot_above_30c':
        advice_text.update(OCCASION_RULES['hot_weather']['advice'])

    # If the occasion is specific, it might clear some general weather items
    if occasion_key != 'general':
        # Start with a clean slate if the occasion is very specific, e.g., formal
        if occasion_key in ['formal_event', 'work_formal', 'sports_exercise']:
             suggested_items.clear()
        
        base = _get_gender_specific_values_from_key(occasion_rules, 'suggest_base', user_gender)
        warm = _get_gender_specific_values_from_key(occasion_rules, 'suggest_if_warm', user_gender)
        cold = _get_gender_specific_values_from_key(occasion_rules, 'suggest_if_cold', user_gender)
        avoid = _get_gender_specific_values_from_key(occasion_rules, 'avoid', user_gender)
        
        suggested_items.update(base)
        protected_by_occasion.update(base)

        if current_temp_category in ['warm_20_30c', 'hot_above_30c']:
            suggested_items.update(warm)
            protected_by_occasion.update(warm)
        elif current_temp_category in ['cold_below_10c', 'mild_10_20c']:
            suggested_items.update(cold)
            protected_by_occasion.update(cold)
        
        suggested_items.difference_update(avoid)
    
    if 'advice' in occasion_rules:
        advice_text.update(occasion_rules['advice'])

    # --- 3. Refine based on User Dislikes ---
    all_disliked_items = user_general_dislikes.union(user_temp_dislikes, user_alert_dislikes)
    items_to_remove = all_disliked_items - protected_by_occasion
    suggested_items.difference_update(items_to_remove)


    # --- 5. Refine Suggestions for Coherence ---
    refined_items = _refine_suggestions(suggested_items, current_temp_category, weather_data.get('is_day', True), occasion=occasion_key)

    return sorted(list(refined_items)), sorted(list(advice_text))

def _refine_suggestions(suggested_items, temp_category, is_day, occasion='general'):
    """Refines a set of suggested items to form a coherent outfit."""
    refined = set()
    # 1. Categorize all suggested items
    categorized = defaultdict(list)
    for item in suggested_items:
        if item in ITEM_CATEGORIES:
            cat = ITEM_CATEGORIES[item]['category']
            categorized[cat].append(item)

    # 2. Handle daytime-only items
    if not is_day:
        for item in list(suggested_items):
            if ITEM_CATEGORIES.get(item, {}).get('daytime', False):
                suggested_items.remove(item)
                if ITEM_CATEGORIES[item]['category'] in categorized:
                    categorized[ITEM_CATEGORIES[item]['category']].remove(item)

    # 3. Core outfit logic
    # If a full-body item is suggested, it replaces base_top and bottom
    if categorized['full_body']:
        # Prioritize more specific full-body items
        if OUTFIT_ITEMS['EVENING_GOWN'] in categorized['full_body']:
            refined.add(OUTFIT_ITEMS['EVENING_GOWN'])
        elif OUTFIT_ITEMS['SUN_DRESS'] in categorized['full_body']:
            refined.add(OUTFIT_ITEMS['SUN_DRESS'])
        elif OUTFIT_ITEMS['DRESS'] in categorized['full_body']:
            refined.add(OUTFIT_ITEMS['DRESS'])
        else:
            refined.add(random.choice(categorized['full_body']))
    else:
        # Select one or two base tops, prioritizing a thermal layer in the cold
        if categorized['base_top']:
            tops = categorized['base_top']
            if temp_category == 'cold_below_10c' and OUTFIT_ITEMS['THERMAL_TOP'] in tops:
                refined.add(OUTFIT_ITEMS['THERMAL_TOP'])
                tops.remove(OUTFIT_ITEMS['THERMAL_TOP'])
            
            if tops:
                # Prioritize warm weather alternatives
                if temp_category == 'hot_above_30c' and OUTFIT_ITEMS['TANK_TOP'] in tops:
                    refined.add(OUTFIT_ITEMS['TANK_TOP'])
                elif temp_category in ['warm_20_30c', 'hot_above_30c'] and OUTFIT_ITEMS['POLO_SHIRT'] in tops:
                    refined.add(OUTFIT_ITEMS['POLO_SHIRT'])
                elif temp_category in ['warm_20_30c', 'hot_above_30c'] and OUTFIT_ITEMS['T_SHIRT'] in tops:
                    refined.add(OUTFIT_ITEMS['T_SHIRT'])
                elif occasion == 'work_office' and temp_category in ['mild_10_20c', 'cold_below_10c'] and OUTFIT_ITEMS['DRESS_SHIRT'] in tops:
                    refined.add(OUTFIT_ITEMS['DRESS_SHIRT'])
                elif tops:
                    refined.add(random.choice(tops))
        
        # Select one bottom
        if categorized['bottom']:
            bottoms = categorized['bottom']
            if occasion == 'sports_exercise' and temp_category == 'cold_below_10c' and OUTFIT_ITEMS['TRACK_PANTS'] in bottoms:
                refined.add(OUTFIT_ITEMS['TRACK_PANTS'])
            elif occasion == 'work_office' and temp_category in ['warm_20_30c', 'hot_above_30c'] and OUTFIT_ITEMS['CHINOS'] in bottoms:
                refined.add(OUTFIT_ITEMS['CHINOS'])
            else:
                if len(bottoms) > 1 and OUTFIT_ITEMS['PANTS'] in bottoms:
                    bottoms.remove(OUTFIT_ITEMS['PANTS'])
                if bottoms:
                    refined.add(random.choice(bottoms))

    # 4. Layering logic
    # Add a mid-layer if it's cool
    if temp_category in ['cold_below_10c', 'mild_10_20c'] and categorized['mid_layer']:
        refined.add(random.choice(categorized['mid_layer']))

    # Add an outer layer
    if categorized['outer_layer']:
        outerwear = categorized['outer_layer']
        chosen_outer_layer = None

        # Highest priority: occasion-specific items
        if occasion == 'sports_exercise' and OUTFIT_ITEMS['RUNNING_JACKET'] in outerwear:
            chosen_outer_layer = OUTFIT_ITEMS['RUNNING_JACKET']

        # Next priority: temperature-specific items
        if not chosen_outer_layer and temp_category == 'cold_below_10c':
            heavy_coats = [item for item in outerwear if ITEM_CATEGORIES.get(item, {}).get('base_temp') == 'freezing']
            if heavy_coats:
                chosen_outer_layer = random.choice(heavy_coats)

        # Default choice
        if not chosen_outer_layer and outerwear:
            chosen_outer_layer = random.choice(outerwear)

        if chosen_outer_layer:
            refined.add(chosen_outer_layer)

    # 5. Shoes and Accessories
    if categorized['shoes']:
        # This re-uses the priority logic from the main function, which is good.
        shoe_priority = [
            OUTFIT_ITEMS['DRESS_SHOES'], OUTFIT_ITEMS['BOOTS'], OUTFIT_ITEMS['WATERPROOF_SHOES'],
            OUTFIT_ITEMS['HIKING_BOOTS'], OUTFIT_ITEMS['SANDALS'], OUTFIT_ITEMS['SNEAKERS'],
            OUTFIT_ITEMS['FLIP_FLOPS'], OUTFIT_ITEMS['SHOES']
        ]
        for shoe in shoe_priority:
            if shoe in categorized['shoes']:
                refined.add(shoe)
                break
    
    # Add all suggested accessories
    if categorized['accessory']:
        for acc in categorized['accessory']:
            refined.add(acc)

    return refined