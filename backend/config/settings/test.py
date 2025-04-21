# config/settings/test.py
from .prod import *

DEBUG = True
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
