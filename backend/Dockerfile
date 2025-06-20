FROM python:3.12-slim

WORKDIR /backend

COPY requirements/base.txt .
COPY requirements/prod.txt .

ENV DJANGO_SETTINGS_MODULE=config.settings.dev

RUN apt-get update && \
    pip install --upgrade pip && pip install -r prod.txt && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
COPY . /backend

EXPOSE 8000

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
