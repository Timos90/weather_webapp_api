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
