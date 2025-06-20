import os
import django

# Set up Django environment if not already set (e.g. for standalone script execution)
# This might not be strictly necessary if running via manage.py shell < file,
# but good practice for scripts that might be run in different ways.
if 'DJANGO_SETTINGS_MODULE' not in os.environ:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

from apps.personalization.outfit_logic import suggest_outfit_py, OUTFIT_ITEMS
from apps.user.models import UserProfile, User
from apps.personalization.models import UserItemPreference
from collections import defaultdict # Added for the script, though not directly used in this snippet for UserItemPreference check

print("--- Starting Alexandra Preference Test ---")

# --- Setup ---
user_name = "alexandra"
alexandra_profile = None
user = None

try:
    user = User.objects.get(username=user_name)
    alexandra_profile = UserProfile.objects.get(user=user)
    print(f"Successfully fetched UserProfile for {user_name}")

    # Verify the specific dislike exists for Alexandra
    # Assuming OUTFIT_ITEMS['SUN_HAT'] corresponds to "sun_hat"
    disliked_item_name = OUTFIT_ITEMS.get('SUN_HAT', 'sun_hat') 
    alert_event_context = "High Wind Warning" # Make sure this matches the event name in your alerts and DB

    print(f"\n--- Checking ALL UserItemPreferences for '{disliked_item_name}' for user '{user_name}' ---")
    all_sun_hat_prefs = UserItemPreference.objects.filter(user=user, item_name=disliked_item_name, preference_type='dislike')
    if all_sun_hat_prefs.exists():
        for p_item in all_sun_hat_prefs:
            print(f"  - Found dislike: Item='{p_item.item_name}', TempContext='{p_item.context_temperature_category}', AlertContext='{p_item.context_alert_event}', Created='{p_item.created_at}'")
    else:
        print(f"  - No dislike preferences found for '{disliked_item_name}' for this user.")
    print("------------------------------------------------------------------------------------")

    try:
        pref = UserItemPreference.objects.get(
            user=user,
            item_name=disliked_item_name,
            preference_type='dislike',
            context_alert_event=alert_event_context
        )
        print(f"VERIFIED: Alexandra has a UserItemPreference: dislikes '{disliked_item_name}' during '{alert_event_context}'.")
    except UserItemPreference.DoesNotExist:
        print(f"WARNING: Alexandra does NOT have a specific UserItemPreference for disliking '{disliked_item_name}' during '{alert_event_context}'.")
        print("The test for filtering this item might not be conclusive if the preference doesn't exist.")
        print("Please ensure 'analyze_feedback.py' created this preference for the test to be fully valid.")

except User.DoesNotExist:
    print(f"User {user_name} not found. Cannot proceed with the test.")
except UserProfile.DoesNotExist:
    print(f"UserProfile for {user_name} not found. Cannot proceed with the test.")
except Exception as e:
    print(f"An error occurred during setup: {e}")


if alexandra_profile and user:
    # --- Craft Weather Data ---
    weather_data_alexandra_dislike_test = {
        "temperature": 26,
        "feels_like": 27,
        "humidity": 60,
        "wind_speed": 15, 
        "weather_main": "Clear",
        "weather_description": "clear sky",
        "weather_icon": "01d",
        "uv_index": 8, 
        "precipitation_chance": 0,
        "is_day": True,
        "alerts": [
            {
                "sender_name": "NWS Weather Prediction Center",
                "event": "High Wind Warning", # Exact event string
                "start": 1700000000,
                "end": 1700099999,
                "description": "Damaging winds will blow down trees and power lines...",
                "tags": ["Wind"]
            }
        ]
    }
    user_gender = alexandra_profile.gender if alexandra_profile.gender else "Woman"

    # --- Test Scenario 1: With Alert ---
    print(f"\nSCENARIO 1: Calling suggest_outfit_py for Alexandra with High Wind Warning and high UV...")
    suggested_outfit_alert, advice_alert = suggest_outfit_py(
        weather_data=weather_data_alexandra_dislike_test,
        user_gender=user_gender,
        user_profile=alexandra_profile
    )

    print(f"Suggested Items (with alert): {suggested_outfit_alert}")
    # print(f"Advice (with alert): {advice_alert}") # Optional: print advice if needed

    disliked_item_value = OUTFIT_ITEMS.get('SUN_HAT', 'sun_hat')

    if disliked_item_value in suggested_outfit_alert:
        print(f"TEST SCENARIO 1 FAILED: '{disliked_item_value}' IS IN SUGGESTIONS despite user dislike in alert context.")
    else:
        print(f"TEST SCENARIO 1 PASSED: '{disliked_item_value}' IS NOT IN SUGGESTIONS, as expected due to user dislike in alert context.")

    # --- Test Scenario 2: Without Alert (Control) ---
    weather_data_alexandra_no_alert = weather_data_alexandra_dislike_test.copy()
    weather_data_alexandra_no_alert['alerts'] = [] # Remove alerts

    print(f"\nSCENARIO 2: Calling suggest_outfit_py for Alexandra with NO alert and high UV...")
    suggested_outfit_no_alert, advice_no_alert = suggest_outfit_py(
        weather_data=weather_data_alexandra_no_alert,
        user_gender=user_gender,
        user_profile=alexandra_profile 
    )
    print(f"Suggested Items (no alert): {suggested_outfit_no_alert}")
    # print(f"Advice (no alert): {advice_no_alert}") # Optional

    if disliked_item_value in suggested_outfit_no_alert:
        print(f"TEST SCENARIO 2 PASSED (Control): '{disliked_item_value}' IS IN SUGGESTIONS when alert is not active (and UV suggests it).")
    else:
        print(f"TEST SCENARIO 2 FAILED (Control): '{disliked_item_value}' IS NOT IN SUGGESTIONS even when alert is not active (but UV should suggest it). This might indicate another issue or a general dislike.")
else:
    print("Cannot run full test scenarios due to missing user profile or user.")

print("\n--- Alexandra Preference Test Finished ---")
