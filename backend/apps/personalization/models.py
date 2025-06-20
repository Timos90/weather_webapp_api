from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.user.models import UserProfile, GENDER_CHOICES # Import from user app

# Create your models here.

class OutfitFeedback(models.Model):
    FEEDBACK_CHOICES = [
        ('like', 'Like'),
        ('dislike', 'Dislike'),
    ]

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='outfit_feedbacks')

    # Store the weather conditions at the time of suggestion.
    # This data comes from the frontend's outfitSuggester.WeatherData interface (see frontend/src/services/outfitSuggester.ts)
    # and includes fields like: feelsLike, temperature, precipitationChance, 
    # weatherMain, weatherDescription, uvIndex, windSpeed, isDay, datetime (all camelCase).
    weather_data = models.JSONField()

    # Store the list of items that were suggested
    # The frontend OutfitSuggestion interface has: items (string[]), advice (string[])
    suggested_outfit = models.JSONField() # Will store the whole OutfitSuggestion object { items: [], advice: [] }

    # Store the user's gender at the time of feedback, as it might change
    user_gender_at_feedback = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES, # Use the GENDER_CHOICES from user.models
        null=True, blank=True 
    )

    feedback_type = models.CharField(
        max_length=10,
        choices=FEEDBACK_CHOICES,
    )

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback from {self.user_profile.user.username} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}: {self.feedback_type}"

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Outfit Feedback"
        verbose_name_plural = "Outfit Feedbacks"


# --- User Specific Item Preferences Model ---

# Define choices here or import from a constants file if shared
TEMPERATURE_CATEGORY_CHOICES = [
    ('cold_below_10c', 'Cold (Below 10°C)'),
    ('mild_10_20c', 'Mild (10-20°C)'),
    ('warm_20_30c', 'Warm (20-30°C)'),
    ('hot_above_30c', 'Hot (Above 30°C)'),
]

PREFERENCE_TYPE_CHOICES = [
    ('like', 'Like'),
    ('dislike', 'Dislike'),
]

FEEDBACK_SOURCE_CHOICES = [
    ('direct_feedback', 'Direct Feedback'),
    ('manual_entry', 'Manual Entry'),
    ('inferred', 'Inferred'),
]

class UserItemPreference(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='item_preferences',
        verbose_name=_("User")
    )
    item_name = models.CharField(
        max_length=100,
        verbose_name=_("Item Name")
    )
    preference_type = models.CharField(
        max_length=10,
        choices=PREFERENCE_TYPE_CHOICES,
        verbose_name=_("Preference Type")
    )
    context_temperature_category = models.CharField(
        max_length=50,
        choices=TEMPERATURE_CATEGORY_CHOICES,
        null=True,
        blank=True,
        verbose_name=_("Temperature Context")
    )
    context_alert_event = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name=_("Alert Context")
    )
    feedback_source = models.CharField(
        max_length=20,
        choices=FEEDBACK_SOURCE_CHOICES,
        default='direct_feedback',
        verbose_name=_("Feedback Source")
    )
    count = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Preference Count/Strength")
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created At"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Updated At"))

    class Meta:
        verbose_name = _("User Item Preference")
        verbose_name_plural = _("User Item Preferences")
        # Application logic (e.g., in analyze_feedback.py using update_or_create) 
        # will handle incrementing 'count' for existing preference combinations.
        ordering = ['-updated_at', 'user', 'item_name']

    def __str__(self):
        context_str = ""
        if self.context_temperature_category:
            context_str += f" (Temp: {self.get_context_temperature_category_display()})"
        if self.context_alert_event:
            context_str += f" (Alert: {self.context_alert_event})"
        # Ensure user.username is accessible; if user_profile is the direct link in OutfitFeedback, adjust accordingly
        # For settings.AUTH_USER_MODEL, .username should be standard.
        return f"{self.user.username} {self.get_preference_type_display()}s {self.item_name}{context_str} (x{self.count})"
