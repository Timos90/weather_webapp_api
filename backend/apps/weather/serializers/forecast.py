from rest_framework import serializers

class ForecastSerializer(serializers.Serializer):
    location = serializers.CharField(max_length=100)
    timestamp = serializers.DateTimeField()
    temperature = serializers.FloatField()
    max_temperature = serializers.FloatField()
    min_temperature = serializers.FloatField()
    humidity = serializers.IntegerField()  # Adjust to FloatField if needed
    weather_description = serializers.CharField(max_length=255)

    def validate(self, data):
        if data['max_temperature'] < data['min_temperature']:
            raise serializers.ValidationError("Max temperature cannot be lower than min temperature.")
        return data

    def validate_humidity(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Humidity must be between 0 and 100.")
        return value
