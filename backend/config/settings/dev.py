from .base import *
import environs

env = environs.Env()

env.read_env(str(BASE_DIR / '.env'))

SECRET_KEY = env.str('SECRET_KEY')

DEBUG = True

ALLOWED_HOSTS = []

THIRD_PARTY_APPS = []

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env.str('DB_NAME'),
        "USER": env.str('DB_USER'),
        "PASSWORD": env.str('DB_PWD'),
        "PORT": env.str('DB_PORT'),
        "HOST": env.str('DB_HOST')
    }
}

WEATHER_API_KEY = env('WEATHER_API_KEY')
OPENWEATHERMAP_API_KEY = env('OPENWEATHERMAP_API_KEY')
NEWS_API_KEY = env('NEWS_API_KEY')
