from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
import re # For emoji detection
from .models import UserProfile, GENDER_CHOICES

# Helper function to detect emojis
def contains_emoji(s):
    if not s: # Handle empty or None strings
        return False
    # Basic emoji pattern (catches most common emojis)
    # For a more comprehensive list, a dedicated library might be better, but this covers many cases.
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE)
    return emoji_pattern.search(s) is not None

# Validator function for serializers
def no_emoji_validator(value):
    if contains_emoji(value):
        raise serializers.ValidationError("Emojis are not allowed in this field.")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields= ['email', 'first_name', 'last_name', 'username'] 

class UserProfileSerializer(serializers.ModelSerializer):
    # Apply no_emoji_validator in addition to any existing validators if needed.
    # For location, we'll ensure it's applied here for profile updates.
    location = serializers.CharField(validators=[no_emoji_validator])
    user = UserSerializer(read_only=True)
    gender = serializers.ChoiceField(choices=GENDER_CHOICES, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'location', 'preferred_temperature_unit', 'gender']

class RegistrationSerializer(serializers.Serializer):
    username   = serializers.CharField(validators=[no_emoji_validator])
    password   = serializers.CharField(write_only=True, validators=[no_emoji_validator])
    email      = serializers.EmailField(validators=[no_emoji_validator])
    first_name = serializers.CharField(required=False, allow_blank=True, validators=[no_emoji_validator]) # Also for first/last name
    last_name  = serializers.CharField(required=False, allow_blank=True, validators=[no_emoji_validator])
    location   = serializers.CharField(required=False, allow_blank=True, validators=[no_emoji_validator])
    preferred_temperature_unit = serializers.ChoiceField(choices=['C','F'], default='C')
    gender = serializers.ChoiceField(choices=GENDER_CHOICES, required=False, allow_blank=True, allow_null=True)

    def validate_username(self, value):
        # no_emoji_validator is already applied at field level
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        """
        Ensure email is unique as well. 
        If you truly want unique emails in the database, 
        also add a unique constraint on the User model’s email field.
        """
        # no_emoji_validator is already applied at field level
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("That email is already taken.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name',''),
            last_name=validated_data.get('last_name','')
        )
        profile = UserProfile.objects.create(
            user=user,
            location=validated_data.get('location',''),
            preferred_temperature_unit=validated_data['preferred_temperature_unit'],
            gender=validated_data.get('gender', None)
        )
        return profile
