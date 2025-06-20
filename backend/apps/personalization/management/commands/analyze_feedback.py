# backend/apps/personalization/management/commands/analyze_feedback.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import F
from apps.personalization.models import OutfitFeedback, UserItemPreference
from collections import defaultdict
import json
import os
import traceback
from pathlib import Path

# Define temperature categories and thresholds (in Celsius)
TEMP_CATEGORIES = {
    "cold_below_10c": lambda t: t < 10,
    "mild_10_20c": lambda t: 10 <= t < 20,
    "warm_20_30c": lambda t: 20 <= t < 30,
    "hot_above_30c": lambda t: t >= 30,
}
# Threshold for an item to be included in alert_specific_dislikes
ALERT_DISLIKE_THRESHOLD = 1

User = get_user_model()

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Optional: Process feedback only for the specified username and skip global JSON generation.',
            default=None
        )
    help = ('Analyzes outfit feedback, focusing on correlations between weather alerts, '
            'temperature ranges, and item likes/dislikes. Populates UserItemPreference model and outputs global stats to a JSON file.')

    def get_temperature_category(self, temperature):
        if temperature is None:
            return None
        for category, condition in TEMP_CATEGORIES.items():
            if condition(temperature):
                return category
        return None

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting feedback analysis...'))

        username_filter = options.get('username')

        if username_filter:
            self.stdout.write(self.style.SUCCESS(f'Processing feedback for user: {username_filter}...'))
            try:
                target_user = User.objects.get(username=username_filter)
                feedback_entries = OutfitFeedback.objects.filter(user_profile__user=target_user).order_by('id')
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User {username_filter} not found.'))
                return
        else:
            self.stdout.write(self.style.SUCCESS('Processing feedback for all users...'))
            feedback_entries = OutfitFeedback.objects.order_by('id')
        
        if not feedback_entries.exists():
            self.stdout.write(self.style.WARNING('No feedback entries found to analyze.'))
            return

        alert_item_stats = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
        general_item_stats_raw = defaultdict(lambda: defaultdict(int))
        temp_range_item_stats_raw = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

        processed_overall_feedback_count = 0
        processed_alert_feedback_count = 0
        processed_temp_feedback_count = 0 # Counts feedback entries with valid temperature for categorization

        user_prefs_created_count = 0
        user_prefs_updated_count = 0

        for feedback in feedback_entries:
            try:
                weather_data = feedback.weather_data
                suggested_outfit_data = feedback.suggested_outfit
                feedback_type = feedback.feedback_type

                # Corrected key for suggested items based on OutfitFeedback model comment
                # The actual key in most of the data appears to be 'suggested_items'
                suggested_items = suggested_outfit_data.get('suggested_items') if isinstance(suggested_outfit_data, dict) else None

                # Get the user associated with the feedback
                user = feedback.user_profile.user if feedback.user_profile else None

                if not isinstance(suggested_items, list) or not suggested_items:
                    continue

                processed_overall_feedback_count += 1
                for item_name in suggested_items:
                    if feedback_type == 'like':
                        general_item_stats_raw[item_name]['likes'] += 1
                    elif feedback_type == 'dislike':
                        general_item_stats_raw[item_name]['dislikes'] += 1
                
                current_temp = None
                if isinstance(weather_data, dict):
                    current_temp = weather_data.get('feelsLike', weather_data.get('temp'))
                
                temp_category_for_entry = None # To ensure processed_temp_feedback_count is incremented once per entry
                if current_temp is not None:
                    try:
                        temp_val = float(current_temp)
                        temp_category = self.get_temperature_category(temp_val)
                        if temp_category:
                            temp_category_for_entry = temp_category # Mark that this entry has a valid temp category
                            for item_name in suggested_items:
                                if feedback_type == 'like':
                                    temp_range_item_stats_raw[temp_category][item_name]['likes'] += 1
                                elif feedback_type == 'dislike':
                                    temp_range_item_stats_raw[temp_category][item_name]['dislikes'] += 1
                    except (ValueError, TypeError):
                        self.stdout.write(self.style.WARNING(f"Could not parse temperature: {current_temp} for feedback ID {feedback.id}"))
                
                if temp_category_for_entry:
                    processed_temp_feedback_count += 1

                alerts = weather_data.get('alerts') if isinstance(weather_data, dict) else None
                if isinstance(alerts, list) and alerts:
                    has_valid_alert_for_processing = False
                    for alert in alerts:
                        if not isinstance(alert, dict) or 'event' not in alert:
                            continue
                        has_valid_alert_for_processing = True
                        alert_event = alert['event']
                        for item_name in suggested_items:
                            if feedback_type == 'like':
                                alert_item_stats[alert_event][item_name]['likes'] += 1
                            elif feedback_type == 'dislike':
                                alert_item_stats[alert_event][item_name]['dislikes'] += 1
                    if has_valid_alert_for_processing:
                        processed_alert_feedback_count +=1
                
                # --- Populate UserItemPreference Model ---
                if user and suggested_items: # Ensure user and items are valid
                    current_temp_val_for_user_pref = None
                    if isinstance(weather_data, dict):
                        temp_reading = weather_data.get('feels_like', weather_data.get('temperature'))
                        if temp_reading is not None:
                            try:
                                current_temp_val_for_user_pref = float(temp_reading)
                            except (ValueError, TypeError):
                                pass # Already warned above, or handle silently for user prefs
                    
                    user_pref_temp_category = self.get_temperature_category(current_temp_val_for_user_pref) if current_temp_val_for_user_pref is not None else None

                    for item_name in suggested_items:
                        # 1. General preference (no specific context)
                        lookup_fields_general = {
                            'user': user,
                            'item_name': item_name,
                            'preference_type': feedback_type,
                            'context_temperature_category': None,
                            'context_alert_event': None,
                            'feedback_source': 'direct_feedback'
                        }
                        obj, created = UserItemPreference.objects.get_or_create(
                            **lookup_fields_general,
                            defaults={'count': 1}
                        )
                        if created:
                            user_prefs_created_count += 1
                        else:
                            obj.count = F('count') + 1
                            obj.save(update_fields=['count', 'updated_at'])
                            user_prefs_updated_count += 1
                        # 2. Temperature-specific preference
                        if user_pref_temp_category:
                            lookup_fields_temp = {
                                'user': user,
                                'item_name': item_name,
                                'preference_type': feedback_type,
                                'context_temperature_category': user_pref_temp_category,
                                'context_alert_event': None,
                                'feedback_source': 'direct_feedback'
                            }
                            obj, created = UserItemPreference.objects.get_or_create(
                                **lookup_fields_temp,
                                defaults={'count': 1}
                            )
                            if created:
                                user_prefs_created_count += 1
                            else:
                                obj.count = F('count') + 1
                                obj.save(update_fields=['count', 'updated_at'])
                                user_prefs_updated_count += 1
                        # 3. Alert-specific preference
                        user_pref_alerts = weather_data.get('alerts') if isinstance(weather_data, dict) else None
                        if isinstance(user_pref_alerts, list) and user_pref_alerts:
                            for alert_detail in user_pref_alerts:
                                if isinstance(alert_detail, dict) and 'event' in alert_detail:
                                    alert_event_name = alert_detail['event']
                                    lookup_fields_alert = {
                                        'user': user,
                                        'item_name': item_name,
                                        'preference_type': feedback_type,
                                        'context_temperature_category': None,
                                        'context_alert_event': alert_event_name,
                                        'feedback_source': 'direct_feedback'
                                    }
                                    obj, created = UserItemPreference.objects.get_or_create(
                                        **lookup_fields_alert,
                                        defaults={'count': 1}
                                    )
                                    if created:
                                        user_prefs_created_count += 1
                                    else:
                                        obj.count = F('count') + 1
                                        obj.save(update_fields=['count', 'updated_at'])
                                        user_prefs_updated_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"ERROR in loop for Feedback ID {feedback.id}: {e}"))
                traceback.print_exc()
                self.stdout.write(self.style.WARNING(f"Skipping Feedback ID {feedback.id} due to error, continuing to next entry..."))
                continue # Try to process next entry
            # End of the for loop body

        # Skip global JSON generation if a specific username is provided
        if username_filter:
            self.stdout.write(self.style.SUCCESS(f'Skipping global JSON generation for single user: {username_filter}'))
        else:
            # output_data and subsequent processing correctly dedented to be outside the for loop
            output_data = {
            "overall_item_stats": {},
            "alert_specific_dislikes": {},
            "temperature_range_feedback": {}
        }

        for item_name, counts in general_item_stats_raw.items():
            likes = counts.get('likes', 0)
            dislikes = counts.get('dislikes', 0)
            output_data["overall_item_stats"][item_name] = {
                "likes": likes,
                "dislikes": dislikes,
                "net_score": likes - dislikes
            }
        
        for alert_event, items_data in alert_item_stats.items():
            current_alert_dislikes = {}
            for item_name, counts in items_data.items():
                dislikes = counts.get('dislikes', 0)
                if dislikes >= ALERT_DISLIKE_THRESHOLD:
                    current_alert_dislikes[item_name] = dislikes
            if current_alert_dislikes:
                 output_data["alert_specific_dislikes"][alert_event] = current_alert_dislikes

        for temp_cat, items_data in temp_range_item_stats_raw.items():
            output_data["temperature_range_feedback"][temp_cat] = {}
            for item_name, counts in items_data.items():
                likes = counts.get('likes', 0)
                dislikes = counts.get('dislikes', 0)
                output_data["temperature_range_feedback"][temp_cat][item_name] = {
                    "likes": likes,
                    "dislikes": dislikes,
                    "net_score": likes - dislikes
                }
        
        command_dir = Path(__file__).resolve().parent.parent.parent
        data_dir = command_dir / 'data'
        os.makedirs(data_dir, exist_ok=True)
        file_path = data_dir / 'learned_item_preferences.json'

        if not username_filter: # Only attempt to write if not in single-user mode
            try:
                with open(file_path, 'w') as f:
                    json.dump(output_data, f, indent=4)
                self.stdout.write(self.style.SUCCESS(f'\nGlobal feedback analysis successfully written to: {file_path}'))
            except IOError as e:
                self.stdout.write(self.style.ERROR(f'\nFailed to write global feedback analysis to file: {e}'))

        self.stdout.write(self.style.SUCCESS(f'\nProcessed {processed_overall_feedback_count} feedback entries for item stats.'))
        self.stdout.write(self.style.SUCCESS(f'Processed {processed_temp_feedback_count} feedback entries with valid temperature for categorization.'))
        self.stdout.write(self.style.SUCCESS(f'Processed {processed_alert_feedback_count} feedback entries with alerts for alert-specific stats.'))

        self.stdout.write(self.style.SUCCESS(f'Created {user_prefs_created_count} new user item preference records.'))
        self.stdout.write(self.style.SUCCESS(f'Updated {user_prefs_updated_count} existing user item preference records.'))

        if not username_filter: # Only attempt to write if not in single-user mode
            if not output_data["overall_item_stats"] and not output_data["alert_specific_dislikes"] and not output_data["temperature_range_feedback"]:
                 self.stdout.write(self.style.WARNING('\nNo feedback data met criteria for global JSON output after processing.'))
