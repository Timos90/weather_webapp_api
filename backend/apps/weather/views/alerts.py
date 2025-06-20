import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
import requests
from apps.weather.serializers.alerts import AlertSerializer
from apps.user.models import UserProfile
import logging
import pycountry

logger = logging.getLogger(__name__)

class AlertsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _get_owm_geocoded_lat_lon(location_name_str: str):
        owm_query_str = location_name_str # Default to original string
        try:
            parts = [p.strip() for p in location_name_str.split(',')]
            if len(parts) > 1 and len(parts[-1]) == 2 and parts[-1].isalpha():
                potential_code = parts[-1].upper()
                country = pycountry.countries.get(alpha_2=potential_code)
                if country:
                    city_part = ', '.join(parts[:-1])
                    owm_query_str = f"{city_part}, {country.name}"
        except Exception as e:
            logger.warning(f"Error refining location '{location_name_str}' with pycountry: {e}. Using original string.")
            # owm_query_str remains location_name_str

        owm_api_key = os.getenv('OPENWEATHERMAP_API_KEY')
        if not owm_api_key:
            logger.error("OpenWeatherMap API key not found for geocoding in AlertsView.")
            return None, None
        
        geocoding_url = 'http://api.openweathermap.org/geo/1.0/direct'
        params = {'q': owm_query_str, 'limit': 1, 'appid': owm_api_key} # Use potentially refined query
        try:
            response = requests.get(geocoding_url, params=params)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                lat = data[0].get('lat')
                lon = data[0].get('lon')
                if lat is not None and lon is not None:
                    logger.info(f"Geocoded '{owm_query_str}' (original: '{location_name_str}') to lat: {lat}, lon: {lon} for alerts.")
                    return lat, lon
                else:
                    logger.warning(f"Lat/Lon not found in OWM geocoding response for '{owm_query_str}' (original: '{location_name_str}'.")
            else:
                logger.warning(f"No OWM geocoding results for '{owm_query_str}' (original: '{location_name_str}'.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error geocoding '{owm_query_str}' (original: '{location_name_str}') with OWM for alerts: {e}")
        return None, None

    def get(self, request, *args, **kwargs):
        lat_param = request.query_params.get('lat')
        lon_param = request.query_params.get('lon')

        api_q_param = None
        source_of_q_param = "None"

        if lat_param and lon_param:
            try:
                # Validate if lat_param and lon_param are valid floats
                valid_lat = float(lat_param)
                valid_lon = float(lon_param)
                api_q_param = f"{valid_lat},{valid_lon}"
                source_of_q_param = "Direct lat/lon from query params"
                logger.info(f"Using direct lat/lon from query params for alerts: '{api_q_param}'")
            except ValueError:
                logger.warning(f"Invalid lat/lon params for alerts: lat='{lat_param}', lon='{lon_param}'. Falling back to location string.")
                # Fall through to location string logic if lat/lon are invalid

        if not api_q_param: # If lat/lon were not provided or were invalid
            city = request.query_params.get('location')
            if not city:
                user = request.user
                user_profile = UserProfile.objects.filter(user=user).first()
                if user_profile and user_profile.location:
                    city = user_profile.location
                    source_of_q_param = "User profile location string"
                    logger.info(f"Alerts: Using location from user profile: '{city}'")
                else:
                    logger.warning("Alerts: No location in query params or user profile.")
                    return Response(
                        {'error': 'Location not provided and not set in user profile.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                source_of_q_param = "Location string from query params"
                logger.info(f"Alerts: Using location string from query params: '{city}'")

            # Geocode the city string (from query param or user profile)
            lat, lon = self._get_owm_geocoded_lat_lon(city)
            if lat is not None and lon is not None:
                api_q_param = f"{lat},{lon}"
                source_of_q_param += " -> OWM geocoded"
                logger.info(f"Alerts: OWM geocoding of '{city}' successful: lat={lat}, lon={lon}. Using for WeatherAPI.")
            else:
                # Fallback to using the original city string if OWM geocoding failed
                api_q_param = city
                source_of_q_param += " -> OWM geocoding failed, using raw string"
                logger.warning(f"Alerts: OWM geocoding of '{city}' failed. Falling back to raw string for WeatherAPI: '{api_q_param}'")

        logger.info(f"Alerts: Final WeatherAPI 'q' parameter: '{api_q_param}' (Source: {source_of_q_param})")

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
        
        api_key = os.getenv('WEATHER_API_KEY', 'test_key')
        if not api_key:
            return Response({'error': 'Weather API key not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        url = 'http://api.weatherapi.com/v1/forecast.json'
        params = {
            'key': api_key,
            'q': api_q_param, # Use the geocoded lat,lon or fallback string
            'alerts': 'yes'
        }

        response = requests.get(url, params=params)
        if response.status_code == 200:
            alerts_data_raw = response.json().get('alerts', {}).get('alert', [])
            
            # De-duplicate alerts
            unique_alerts_data = []
            seen_alert_signatures = set()

            for alert_item in alerts_data_raw:
                # Create a signature for the alert to check for uniqueness
                # Using headline, event, effective, and expires as they are likely to define a unique alert event
                # Ensure None values are handled consistently for the signature
                effective_time = alert_item.get("effective") if alert_item.get("effective") else None
                expires_time = alert_item.get("expires") if alert_item.get("expires") else None
                
                signature = (
                    alert_item.get("headline"),
                    alert_item.get("event"),
                    effective_time, # Use the processed value (None if empty)
                    expires_time    # Use the processed value (None if empty)
                )
                
                if signature not in seen_alert_signatures:
                    unique_alerts_data.append(alert_item)
                    seen_alert_signatures.add(signature)
            
            # Proceed with serialization using unique_alerts_data
            serialized_data = [
                {
                    "headline": alert.get("headline"),
                    "msgtype": alert.get("msgtype"),
                    "urgency": alert.get("urgency"),
                    "event": alert.get("event"),
                    "desc": alert.get("desc"),
                    "effective": alert.get("effective") if alert.get("effective") else None,
                    "expires": alert.get("expires") if alert.get("expires") else None
                }
                for alert in unique_alerts_data # Use the de-duplicated list
            ]

            serializer = AlertSerializer(data=serialized_data, many=True)
            if serializer.is_valid():
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        if response.status_code == 404:
            return Response({'error': 'No alerts found for your location!!!'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Failed to fetch alerts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
