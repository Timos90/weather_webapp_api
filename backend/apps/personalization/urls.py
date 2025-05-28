from django.urls import path
from .views import OutfitFeedbackView

app_name = 'personalization-urls'
urlpatterns = [
    path('feedback/outfit/', OutfitFeedbackView.as_view(), name='outfit-feedback'),
]
