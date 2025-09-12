# backend/apps/personalization/serializers.py
from rest_framework import serializers
from .models import OutfitFeedback

class OutfitFeedbackSerializer(serializers.ModelSerializer):
    # user_profile = UserProfileSerializer(read_only=True) # Option 1: Nested read-only UserProfile
    # user_profile_id = serializers.IntegerField(source='user_profile.id', read_only=True) # Option 2: Just the ID

    class Meta:
        model = OutfitFeedback
        fields = [
            'id',
            'user_profile', # This will be handled by the view to set from request.user
            'weather_data',
            'suggested_outfit',
            'feedback_type',
            'user_gender_at_feedback',
            'timestamp'
        ]
        read_only_fields = ['timestamp', 'user_profile'] # user_profile is effectively read-only from serializer perspective

    def create(self, validated_data):
        # The view will be responsible for setting user_profile from request.user
        # So, we expect it to be passed in validated_data by the view after adding it.
        return OutfitFeedback.objects.create(**validated_data)


class OutfitSuggestionRequestSerializer(serializers.Serializer):
    feels_like = serializers.FloatField(required=True)
    temperature = serializers.FloatField(required=True)
    precipitation_chance = serializers.IntegerField(required=False, min_value=0, max_value=100, allow_null=True, default=0)
    weather_main = serializers.CharField(max_length=100, required=True) # e.g., "Clouds", "Rain"
    weather_description = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    uv_index = serializers.FloatField(required=False, min_value=0, allow_null=True)
    wind_speed = serializers.FloatField(required=False, min_value=0, allow_null=True)
    humidity = serializers.IntegerField(required=False, min_value=0, max_value=100, allow_null=True)
    cloud_cover = serializers.IntegerField(required=False, min_value=0, max_value=100, allow_null=True)
    air_quality_index = serializers.IntegerField(required=False, min_value=0, allow_null=True) # General AQI
    is_day = serializers.BooleanField(required=False, default=True)
    datetime = serializers.DateTimeField(required=False, allow_null=True)
    occasion = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    user_gender = serializers.ChoiceField(
        choices=['Man', 'Woman', 'Other', 'Unspecified'],
        required=False,
        default='Unspecified'
    )
    unit = serializers.ChoiceField(
        choices=['C', 'F'],
        required=False,
        default='C' # Default to Celsius
    )
    alerts = serializers.ListField(
        child=serializers.DictField(), 
        required=False, 
        allow_null=True, 
        help_text="Optional list of weather alert objects, e.g., [{'event': 'Heat Advisory', 'description': '...'}]"
    )

    # Datetime field is already present and required
    # weather_main is already present and required

    # Optional fields from previous serializer version, ensuring they are still optional
    # and allow null if not provided, or have sensible defaults.
    # precipitation_chance already has default 0.
    # weather_description allows blank and null.
    # uv_index allows null.
    # wind_speed allows null.
    # is_day has default True.
    # user_gender has default 'Unspecified'.

    def validate(self, data):
        """
        Custom cross-field validations can be added here if necessary.
        """
        # Example validation (can be uncommented and adapted if needed):
        # if data.get('precipitation_chance', 0) > 70 and data.get('weather_main') not in ['Rain', 'Snow', 'Drizzle', 'Thunderstorm']:
        #     raise serializers.ValidationError({
        #         'weather_main': 'With high precipitation chance, weather_main should indicate precipitation (e.g., Rain, Snow).'
        #     })
        return data


class OutfitSuggestionResponseSerializer(serializers.Serializer):
    suggested_items = serializers.ListField(
        child=serializers.CharField()
    )
    advice_strings = serializers.ListField(
        child=serializers.CharField()
    )
