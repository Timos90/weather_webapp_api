from rest_framework import serializers
from .models import OutfitFeedback
from apps.user.models import UserProfile # For type hinting or if used directly

class OutfitFeedbackSerializer(serializers.ModelSerializer):
    # user_profile will be set in the view based on the request.user
    # We don't need to explicitly include it here for writing if the view handles it.
    # For reading, if we ever list feedback, we might want to show user details.

    class Meta:
        model = OutfitFeedback
        # Fields to be accepted from the frontend payload
        fields = [
            'id', 
            'weather_data', 
            'suggested_outfit', 
            'user_gender_at_feedback', 
            'feedback_type', 
            'timestamp',
            'user_profile' # Include for reading, will be populated by default DRF behavior
        ]
        read_only_fields = ['id', 'timestamp', 'user_profile'] 
        # user_profile is read-only because it will be set by the view, not by client payload.

    # No custom create needed if the view handles setting user_profile
    # If we wanted to pass user_profile_id in payload:
    # user_profile = serializers.PrimaryKeyRelatedField(queryset=UserProfile.objects.all(), write_only=True)
    # And then fields would include 'user_profile' for writing.
    # But it's cleaner to set it in the view.
