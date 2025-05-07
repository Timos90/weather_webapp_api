from rest_framework import serializers
from apps.weather.models import Current
from apps.weather.models.location import FavoriteLocation


class CurrentSerializer(serializers.ModelSerializer):
    location = serializers.PrimaryKeyRelatedField(queryset=FavoriteLocation.objects.all())
    
    def validate_temperature(self, value):
        if value < -100 or value > 100:
            raise serializers.ValidationError("Temperature must be between -100 and 100 degrees.")
        return value
    
    def validate_humidity(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Humidity must be between 0 and 100.")
        return value

    
    class Meta:
        model = Current
        exclude = ('id',)
