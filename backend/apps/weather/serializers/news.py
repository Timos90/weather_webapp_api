from rest_framework import serializers

class NewsSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    url = serializers.URLField()
    publishedAt = serializers.DateTimeField()
    content = serializers.CharField(max_length=500)
    urlToImage = serializers.URLField(allow_null=True)