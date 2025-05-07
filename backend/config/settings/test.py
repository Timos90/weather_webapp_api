from .base import *
<<<<<<< HEAD

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

=======
SECRET_KEY = 'test-secret-key'

DEBUG = True

ALLOWED_HOSTS = ['*']

DATABASES = {
     'default': {
         'ENGINE': 'django.db.backends.sqlite3',
         'NAME': ':memory:',
     }
 }
 
CACHES = {
     'default': {
         'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
     }
 }
 
AUTH_PASSWORD_VALIDATORS = []
>>>>>>> main
