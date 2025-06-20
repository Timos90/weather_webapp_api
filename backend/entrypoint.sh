#!/bin/sh

set -e

# Ensure DJANGO_SETTINGS_MODULE is set, if not, default (though Dockerfile ENV should handle this)
: "${DJANGO_SETTINGS_MODULE?DJANGO_SETTINGS_MODULE not set or empty}"

echo "Using DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"

echo "Running migrations and collecting static files..."
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --log-level INFO
