from rest_framework import serializers

class AlertSerializer(serializers.Serializer):
    headline = serializers.CharField(max_length=255, allow_null=True, allow_blank=True) # Increased max_length just in case
    msgtype = serializers.CharField(max_length=50, allow_null=True, allow_blank=True)
    urgency = serializers.CharField(max_length=50, allow_null=True, allow_blank=True)
    event = serializers.CharField(max_length=100, allow_null=True, allow_blank=True) # Increased max_length
    effective = serializers.DateTimeField(input_formats=['%Y-%m-%d %H:%M', 'iso-8601'], allow_null=True)
    desc = serializers.CharField(max_length=2000, allow_null=True, allow_blank=True)
    expires = serializers.DateTimeField(input_formats=['%Y-%m-%d %H:%M', 'iso-8601'], allow_null=True)

    def validate(self, data):
        effective_time = data.get('effective')
        expires_time = data.get('expires')

        # Only perform validation if both times are present
        if effective_time and expires_time:
            if expires_time <= effective_time:
                raise serializers.ValidationError(
                    {"time_validation": "Expiration time must be later than effective time."}
                )
        # You could add more specific validation here if needed, e.g., if one is present, the other must be too.
        return data
