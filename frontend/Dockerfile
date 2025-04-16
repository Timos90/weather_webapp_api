FROM node:20-alpine AS build

WORKDIR /frontend

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# 👇 Add this to ensure Vite uses production env
COPY .env.production .env

# Build the app
RUN npm run build

# Serve using Nginx
FROM nginx:alpine
COPY --from=build /frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
