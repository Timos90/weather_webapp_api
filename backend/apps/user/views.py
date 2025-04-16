from django.contrib.auth.models import User
from django.contrib.auth import logout
from django.shortcuts import get_object_or_404
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializer import RegistrationSerializer,UserProfileSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()  # this calls create()
            # Generate token
            token, created = Token.objects.get_or_create(user=profile.user)
            # Return the newly created user profile
            return Response(
                {'token': token.key, 'user': UserProfileSerializer(profile).data},
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    Logs in a user and returns a token.
    - If "remember me" is needed, handle that in the front-end logic
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=username)
            if not user.check_password(password):
                return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get or create a token for the user
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logs out a user by deleting their authentication token.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # This check ensures the user has a token
        if not hasattr(request.user, 'auth_token'):
            return Response({'error': 'No token found.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.auth_token.delete()
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_or_create_user_profile(self, user):
        return get_object_or_404(UserProfile, user=user)

    def get(self, request):
        user_profile = self.get_or_create_user_profile(request.user)
        serializer = UserProfileSerializer(user_profile)
        return Response(serializer.data)

    def put(self, request):
        user_profile = self.get_or_create_user_profile(request.user)
        data = request.data

        user = request.user
        new_username = data.get('username', user.username)
        new_email = data.get('email', user.email)

        # 1) Check if the new username is different and already in use
        if new_username != user.username:
            if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                return Response(
                    {'error': 'That username is already in use.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2) Check if the new email is different and already in use (if you also want email uniqueness)
        if new_email != user.email:
            if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                return Response(
                    {'error': 'That email is already in use.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if new_email != user.email:  # Only validate if the user actually changed it
            try:
                validate_email(new_email)  # raises ValidationError if invalid
            except ValidationError:
                return Response(
                    {'error': 'Please provide a valid email address.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        # If all checks pass, update
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = new_email
        user.username = new_username
        user.save()

        user_profile.location = data.get('location', user_profile.location)
        user_profile.preferred_temperature_unit = data.get(
            'preferred_temperature_unit',
            user_profile.preferred_temperature_unit
        )
        user_profile.save()

        serializer = UserProfileSerializer(user_profile)
        return Response(serializer.data)



class DeleteAccountView(APIView):
    """
    Deletes the authenticated user’s account if the provided email matches.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        provided_email = request.data.get('email')
        if not provided_email:
            return Response(
                {'error': 'Please provide your email for confirmation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        # Compare the provided email with the user's email (case-insensitive)
        if provided_email.lower() != user.email.lower():
            return Response(
                {'error': 'Provided email does not match your account email.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete the user (this will cascade delete the related UserProfile if set up correctly)
        user.delete()
        return Response(
            {'message': 'Account deleted successfully.'},
            status=status.HTTP_200_OK
        )
