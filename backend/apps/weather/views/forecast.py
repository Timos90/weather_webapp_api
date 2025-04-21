import os
import requests
from datetime import datetime
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.user.models import UserProfile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ForecastListView(APIView):
    """Fetches multi-day forecast for any location or geolocation."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [AllowAny]  # Guests can view forecasts

    def get(self, request, *args, **kwargs):
        location_name = request.query_params.get('location')
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')

        # Grab 'units' from query param (default 'metric')
        units = request.query_params.get('units', 'metric')

        if not location_name and not (lat and lon) and request.user.is_authenticated:
            user_profile = UserProfile.objects.filter(user=request.user).first()
            if user_profile and user_profile.location:
                location_name = user_profile.location
            else:
                return Response(
                    {'error': 'No location provided and no saved location found.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        api_key = os.getenv('OPENWEATHERMAP_API_KEY', 'test_key')
        if not api_key:
            return Response(
                {'error': 'OpenWeatherMap API key not set.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if location_name:
            url = (f"http://api.openweathermap.org/data/2.5/forecast?"
                   f"q={location_name}&appid={api_key}&units={units}")
        elif lat and lon:
            url = (f"http://api.openweathermap.org/data/2.5/forecast?"
                   f"lat={lat}&lon={lon}&appid={api_key}&units={units}")
        else:
            return Response(
                {'error': 'Please provide a location or geolocation coordinates.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = requests.get(url)
            if response.status_code == 404:
                return Response(
                    {'error': f'Location "{location_name}" not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            elif response.status_code != 200:
                return Response(
                    {'error': 'Failed to fetch forecast data.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response(response.json(), status=status.HTTP_200_OK)
        except requests.exceptions.RequestException as e:
            return Response(
                {'error': f'Error fetching forecast data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
