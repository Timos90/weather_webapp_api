from .base import *
import environs
import os


env = environs.Env()

env.read_env(str(BASE_DIR / '.env'))

DEBUG = False

ALLOWED_HOSTS = ["*"]

THIRD_PARTY_APPS = []

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get('DB_NAME', 'default_db'),
        "USER": os.environ.get('DB_USER', 'default_user'),
        "PASSWORD": os.environ.get('DB_PWD', 'default_password'),
        "PORT": os.environ.get('DB_PORT', '5432'),
        "HOST": os.environ.get('DB_HOST', 'db'),
    }
}

SECRET_KEY = env('SECRET_KEY')
WEATHER_API_KEY = env('WEATHER_API_KEY')
OPENWEATHERMAP_API_KEY = env('OPENWEATHERMAP_API_KEY')
NEWS_API_KEY = env('NEWS_API_KEY')

STATIC_ROOT = str(BASE_DIR / "staticfiles")
STATICFILES_DIRS = []
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    'corsheaders.middleware.CorsMiddleware',
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
