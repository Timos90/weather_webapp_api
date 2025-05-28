from django.contrib import admin
from .models import OutfitFeedback

# Register your models here.

@admin.register(OutfitFeedback)
class OutfitFeedbackAdmin(admin.ModelAdmin):
    list_display = ('user_profile_username', 'feedback_type', 'weather_data_datetime_display', 'timestamp', 'user_gender_at_feedback')
    list_filter = ('feedback_type', 'user_gender_at_feedback', 'timestamp')
    search_fields = ('user_profile__user__username', 'weather_data__datetime')
    readonly_fields = ('timestamp',)

    def user_profile_username(self, obj):
        return obj.user_profile.user.username
    user_profile_username.short_description = 'User'
    user_profile_username.admin_order_field = 'user_profile__user__username'

    def weather_data_datetime_display(self, obj):
        # Safely access 'datetime' from the weather_data JSONField
        if isinstance(obj.weather_data, dict) and 'datetime' in obj.weather_data:
            from datetime import datetime
            try:
                # Assuming datetime is a Unix timestamp (if it's numeric) or ISO string
                ts_value = obj.weather_data['datetime']
                if isinstance(ts_value, (int, float)):
                    return datetime.fromtimestamp(ts_value).strftime('%Y-%m-%d %H:%M:%S %Z')
                elif isinstance(ts_value, str):
                    # Attempt to parse ISO string, common formats
                    return datetime.fromisoformat(ts_value.replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S %Z')
            except (TypeError, ValueError):
                return obj.weather_data['datetime'] # Return raw if not parsable
        return None
    weather_data_datetime_display.short_description = 'Weather Timestamp (datetime)'

    fieldsets = (
        (None, {
            'fields': ('user_profile_username_display', 'feedback_type', 'user_gender_at_feedback', 'timestamp')
        }),
        ('Data Snapshot', {
            'fields': ('weather_data', 'suggested_outfit'),
            'classes': ('collapse',), # Make it collapsible
        }),
    )
    readonly_fields = ('timestamp', 'user_profile_username_display', 'weather_data_datetime_display_readonly')

    def user_profile_username_display(self, obj):
        return obj.user_profile.user.username
    user_profile_username_display.short_description = 'User'

    def weather_data_datetime_display_readonly(self, obj):
        return self.weather_data_datetime_display(obj) # Reuse the display logic
    weather_data_datetime_display_readonly.short_description = 'Weather Timestamp (datetime)'

    # To make user_profile searchable and filterable, it's often better to link directly
