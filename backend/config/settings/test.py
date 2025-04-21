from .base import *

SECRET_KEY = 'test-secret-key'
DEBUG = True
ALLOWED_HOSTS = ['*']

# Use SQLite in-memory DB for fast tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Use dummy cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Disable password validation for test speed
AUTH_PASSWORD_VALIDATORS = []

