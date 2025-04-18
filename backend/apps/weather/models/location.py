from django.db import models
from django.contrib.auth.models import User

class FavoriteLocation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    city_name = models.CharField(max_length=100)
    country_code = models.CharField(max_length=3)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'city_name', 'country_code')

    def __str__(self):
        return f"{self.city_name}, {self.country_code} (User: {self.user.username})"
