from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from .models import UserProfile, GENDER_CHOICES

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields= ['email', 'first_name', 'last_name', 'username'] 

location_validator = RegexValidator(
    regex=r'^[a-zA-Z\s]*$',
    message='Enter a valid location name.'
)

class UserProfileSerializer(serializers.ModelSerializer):
    location = serializers.CharField(validators=[location_validator])
    user = UserSerializer(read_only=True)
    gender = serializers.ChoiceField(choices=GENDER_CHOICES, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'location', 'preferred_temperature_unit', 'gender']

class RegistrationSerializer(serializers.Serializer):
    username   = serializers.CharField()
    password   = serializers.CharField(write_only=True)
    email      = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name  = serializers.CharField(required=False, allow_blank=True)
    location   = serializers.CharField(required=False, allow_blank=True)
    preferred_temperature_unit = serializers.ChoiceField(choices=['C','F'], default='C')
    gender = serializers.ChoiceField(choices=GENDER_CHOICES, required=False, allow_blank=True, allow_null=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        """
        Ensure email is unique as well. 
        If you truly want unique emails in the database, 
        also add a unique constraint on the User model’s email field.
        """
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
