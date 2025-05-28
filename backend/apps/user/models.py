from django.db import models
from django.contrib.auth.models import User
from apps.core.constants import PREFERRED_UNITS

GENDER_CHOICES = [
    ('Man', 'Man'),
    ('Woman', 'Woman'),
    ('Non-binary', 'Non-binary'),
]

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    location = models.CharField(max_length=100)
    preferred_temperature_unit = models.CharField(max_length=1, choices=PREFERRED_UNITS, default='C')
    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        blank=True, 
        null=True
    )

    def __str__(self):
        return f"{self.user.username}'s profile"
