import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
import requests
from apps.weather.serializers.alerts import AlertSerializer
from apps.user.models import UserProfile

class AlertsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        city = request.query_params.get('location')
        if not city:
            user = request.user
            user_profile = UserProfile.objects.filter(user=user).first()
            if user_profile and user_profile.location:
                city = user_profile.location
            else:
                return Response(
                    {'error': 'User location not set. Please update your profile.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        api_key = os.getenv('WEATHER_API_KEY')
        if not api_key:
            return Response({'error': 'Weather API key not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        url = 'http://api.weatherapi.com/v1/forecast.json'
        params = {
            'key': api_key,
            'q': city,
            'alerts': 'yes'
        }

        response = requests.get(url, params=params)
        if response.status_code == 200:
            alerts_data = response.json().get('alerts', {}).get('alert', [])
            serialized_data = [
                {
                    "headline": alert.get("headline"),
                    "msgtype": alert.get("msgtype"),
                    "urgency": alert.get("urgency"),
                    "event": alert.get("event"),
                    "desc": alert.get("desc"),
                    "effective": alert.get("effective"),
                    "expires": alert.get("expires")
                }
                for alert in alerts_data
            ]

            serializer = AlertSerializer(data=serialized_data, many=True)
            if serializer.is_valid():
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        if response.status_code == 404:
            return Response({'error': 'No alerts found for your location!!!'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Failed to fetch alerts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
