from django.contrib.auth.models import User
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile
from .serializer import RegistrationSerializer, UserProfileSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()
            refresh = RefreshToken.for_user(profile.user)
            return Response({
                'user': UserProfileSerializer(profile).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# LoginView is now handled by simple-jwt's TokenObtainPairView

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_or_create_user_profile(self, user):
        return get_object_or_404(UserProfile, user=user)

    def get(self, request):
        user_profile = self.get_or_create_user_profile(request.user)
        serializer = UserProfileSerializer(user_profile)
        return Response(serializer.data)

    def put(self, request):
        user_profile = self.get_or_create_user_profile(request.user)
        serializer = UserProfileSerializer(user_profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        provided_email = request.data.get('email')
        if not provided_email:
            return Response(
                {'error': 'Please provide your email for confirmation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        if provided_email.lower() != user.email.lower():
            return Response(
                {'error': 'Provided email does not match your account email.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.delete()
        return Response(
            {'message': 'Account deleted successfully.'},
            status=status.HTTP_200_OK
        )
