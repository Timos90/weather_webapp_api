from .base import *
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