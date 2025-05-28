from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import OutfitFeedback
from .serializer import OutfitFeedbackSerializer
from apps.user.models import UserProfile # Needed for type checking if not directly used for query

# Create your views here.

class OutfitFeedbackView(generics.CreateAPIView):
    """
    API endpoint for users to submit outfit feedback.
    Only authenticated users can submit feedback.
    """
    queryset = OutfitFeedback.objects.all() # Required for CreateAPIView
    serializer_class = OutfitFeedbackSerializer
    authentication_classes = [TokenAuthentication] # Consistent with other protected views
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        weather_data = serializer.validated_data.get('weather_data', {})
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
        serializer.save(user_profile=user_profile)
