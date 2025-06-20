from rest_framework import serializers

class NewsSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500, allow_null=True, allow_blank=True)
    url = serializers.URLField() # Keep URL as required
    publishedAt = serializers.DateTimeField() # Keep publishedAt as required
    content = serializers.CharField(max_length=500, allow_null=True, allow_blank=True)
    urlToImage = serializers.URLField(allow_null=True, allow_blank=True) # Also allow blank for urlToImage