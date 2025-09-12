from django.shortcuts import render
from rest_framework import generics, status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OutfitFeedback
from .serializers import OutfitFeedbackSerializer, OutfitSuggestionRequestSerializer, OutfitSuggestionResponseSerializer
from .outfit_logic import suggest_outfit_py
from .utils import convert_to_celsius
from apps.user.models import UserProfile # Needed for type checking if not directly used for query

# Create your views here.

class OutfitFeedbackView(generics.CreateAPIView):
    """
    API endpoint for users to submit outfit feedback.
    Only authenticated users can submit feedback.
    """
    queryset = OutfitFeedback.objects.all() # Required for CreateAPIView
    serializer_class = OutfitFeedbackSerializer
    authentication_classes = [JWTAuthentication] # Use JWT for consistency with the project
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract and process weather_data for temperature conversion
        # We need a mutable copy if we are to change it before saving
        raw_weather_data = dict(serializer.validated_data.get('weather_data', {}))
        original_unit = raw_weather_data.pop('unit', 'C')

        processed_weather_data = {}
        for key, value in raw_weather_data.items():
            if value is None:
                continue

            if key == 'temperature':
                processed_weather_data['temperature'] = convert_to_celsius(value, original_unit)
            elif key == 'feelsLike':
                # Convert and rename the key to snake_case
                processed_weather_data['feels_like'] = convert_to_celsius(value, original_unit)
            else:
                # Preserve other keys
                processed_weather_data[key] = value
        
        # Update validated_data with processed weather_data for perform_create
        # This is a bit indirect; ideally, this transformation happens earlier or within serializer validation.
        # For now, we'll pass it to perform_create via a custom kwarg or by modifying the instance.
        # Let's modify the data that will be used by perform_create directly on the serializer instance
        # This assumes perform_create uses serializer.validated_data or similar.
        # A cleaner way might be to override perform_create to accept processed_weather_data.

        # For simplicity, we'll update the validated_data on the serializer instance before perform_create is called.
        # This is generally okay if perform_create relies on serializer.validated_data.
        # Note: This modification of serializer.validated_data post-is_valid is a bit unconventional.
        # A more robust approach might involve a custom serializer field or a pre-save signal.
        serializer.validated_data['weather_data'] = processed_weather_data

        weather_data = processed_weather_data # Use the processed data for checks like datetime
        weather_datetime = weather_data.get('datetime')

        if weather_datetime is not None:
            try:
                # Robustly fetch UserProfile
                user_profile = UserProfile.objects.get(user=request.user)
                existing_feedback = OutfitFeedback.objects.filter(
                    user_profile=user_profile,
                    weather_data__datetime=weather_datetime
                ).exists()
                if existing_feedback:
                    return Response(
                        {"detail": "Feedback already submitted for this weather time slot."},
                        status=status.HTTP_409_CONFLICT
                    )
            except UserProfile.DoesNotExist:
                return Response(
                    {"detail": "User profile not found for the authenticated user."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # If we reach here, either weather_datetime was None, or no existing feedback was found.
        # We still need to ensure the user_profile exists for perform_create.
        try:
            user_profile_for_save = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response(
                {"detail": "User profile not found for the authenticated user before saving."},
                status=status.HTTP_400_BAD_REQUEST # Ensure profile exists before perform_create
            )

        self.perform_create(serializer, user_profile_for_save) # Pass fetched profile
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer, user_profile):
        # user_profile is now passed directly
        # weather_data in serializer.validated_data should now have Celsius temperatures
        serializer.save(user_profile=user_profile)


class OutfitSuggestionView(APIView):
    """
    API endpoint to get outfit suggestions based on weather data and optional gender.
    Does not require authentication.
    """
    permission_classes = [AllowAny] # Explicitly allow any user

    def post(self, request, *args, **kwargs):
        request_serializer = OutfitSuggestionRequestSerializer(data=request.data)
        if request_serializer.is_valid():
            weather_data_validated = request_serializer.validated_data
            user_gender = weather_data_validated.pop('user_gender', None)
            occasion = weather_data_validated.pop('occasion', None) # Get occasion
            unit = weather_data_validated.pop('unit', 'C') # Get unit, default to 'C'
            alerts_data = weather_data_validated.pop('alerts', None) # Get alerts, default to None

            user_profile_instance = None
            if request.user.is_authenticated:
                try:
                    user_profile_instance = request.user.userprofile
                except UserProfile.DoesNotExist:
                    # This case should ideally not happen if UserProfile is created with User
                    pass # user_profile_instance remains None

            # Prepare weather_data for suggest_outfit_py, converting temperatures
            weather_data_for_logic = {}
            for key, value in weather_data_validated.items():
                if key == 'feels_like' or key == 'temperature':
                    weather_data_for_logic[key] = convert_to_celsius(value, unit)
                else:
                    weather_data_for_logic[key] = value
            
            if alerts_data is not None:
                weather_data_for_logic['alerts'] = alerts_data
            
            # The suggest_outfit_py expects all weather keys, even if None
            # The serializer ensures required keys are present or provides defaults (like None for optional)
            suggested_items_list, advice_strings_list = suggest_outfit_py(
                weather_data=weather_data_for_logic,
                user_gender=user_gender,
                occasion=occasion,
                user_id=user_profile_instance.id if user_profile_instance else None
            )
            
            response_data = {
                'suggested_items': suggested_items_list,
                'advice_strings': advice_strings_list
            }
            response_serializer = OutfitSuggestionResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True) # Validate the data structure
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
