from django.urls import path
from .views import OutfitFeedbackView, OutfitSuggestionView

app_name = 'personalization-urls'
urlpatterns = [
    path('feedback/outfit/', OutfitFeedbackView.as_view(), name='outfit-feedback'),
    path('suggest-outfit/', OutfitSuggestionView.as_view(), name='suggest-outfit'),
]
