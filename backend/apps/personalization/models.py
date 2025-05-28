from django.db import models
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
