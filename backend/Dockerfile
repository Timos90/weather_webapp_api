# Base image
FROM python:3.12-slim

# Set working directory
WORKDIR /backend

# Install dependencies
COPY requirements/base.txt .
COPY requirements/prod.txt .
RUN pip install --upgrade pip && pip install -r prod.txt
# Copy source code
COPY . /backend

# Expose port
EXPOSE 8000

# run entrypoint.sh to execute at container startup
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
