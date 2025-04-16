from django.urls import path
from .views import RegisterView, LoginView, LogoutView, UserProfileView, DeleteAccountView

app_name = 'user-urls'
urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('delete_account/', DeleteAccountView.as_view(), name='delete-account'),
]

