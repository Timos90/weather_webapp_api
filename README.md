# Weather App

[![CI/CD Status](https://github.com/Timos90/weather_webapp_api/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Timos90/weather_webapp_api/actions)

Live demo: [www.tms-v.com](https://www.tms-v.com)

## Overview

Weather_webapp_api is a full‑stack weather web application that lets users look up current conditions, multi‑day forecasts, weather news and alerts, manage favorite locations, and personalize their settings. It’s built with:

- **Backend**: Django + Django REST Framework, token‑based auth  
- **Frontend**: React (Vite + TypeScript), Tailwind‑inspired CSS  
- **APIs**: OpenWeatherMap, NewsAPI, WeatherAPI  
- **Testing**: Python `unittest` (backend), Vitest (frontend)  
- **Deployment**: Docker containers on Oracle Cloud with a Namecheap domain  

---

## What's New in v1.1.0: Auth System Polish & Bug Fixes

This minor update focuses on hardening the authentication system, improving the user experience, and fixing key bugs. It enhances the existing functionality with more robust error handling and a cleaner codebase.

- **Authentication System Enhancements**:
  - **JWT Token Refresh**: Implemented an automatic JWT token refresh mechanism on the frontend. Users now remain logged in seamlessly without being interrupted by expired tokens.
  - **Refactored Profile Updates**: The backend logic for updating user profiles has been refactored to align with Django REST Framework best practices, moving validation logic into the serializer for a cleaner, more maintainable codebase.
  - **Improved User Flow**: After a new user successfully registers, they are now presented with a direct link to the login modal, streamlining the onboarding process.

- **Key Bug Fixes**:
  - **Registration Error Handling**: Fixed a critical bug where the registration form would crash if a user tried to register with a username that was already taken. The system now displays a clear and specific error message.
  - **Profile Update UI**: Resolved an issue where changes to a user's profile (e.g., first name) were not immediately reflected in the UI, requiring a manual page refresh. The interface now updates instantly after a successful save.
  - **Test Suite Stability**: Addressed and fixed all failing tests in both the frontend (Vitest) and backend (Django `unittest`) test suites, ensuring the codebase is stable and reliable.

---

## What's New in v1.0.0: The AI Personalization Update

This major update transitioned the application from a standard weather utility to a personalized, AI-powered weather companion. The core logic for suggestions was moved from the frontend to a robust Django backend, enabling more sophisticated and context-aware features.

- **AI-Powered Outfit Advisor**: A new modal on the homepage provides dynamic, context-aware outfit suggestions based on weather, occasion, and user feedback.
- **Backend Overhaul**: Introduced a new `personalization` Django app, new API endpoints for suggestions and feedback, and an automated background job for feedback analysis.
- **Frontend Enhancements**: Integrated the new Outfit Advisor, migrated the API layer to `axios`, and completed JSDoc for all major components.

---

## Core Features

- **User Management**: Registration, Login/Logout (token-based), profile management (location, units), and secure account deletion.
- **Favorites**: Add, remove, and view weather for a personalized list of favorite locations.
- **Comprehensive Weather Data**:
  - Current weather, 5-day/3-hourly forecasts, and UV index.
  - Interactive weather map with multiple tile layers.
- **Alerts & News**: Fetches severe weather alerts and multi-language, weather-related news articles.
- **Responsive UI**: A clean, responsive interface with interactive modals and animations.

---

## Project Structure

- **Frontend (`/frontend`)**:
  - Built with **React (Vite + TypeScript)**.
  - **Components**: A modular library of reusable components in `src/components/`.
  - **API Layer**: Centralized API functions in `src/api/` using `axios`.
  - **State Management**: Primarily uses React hooks (`useState`, `useContext`).
  - **Testing**: Unit and component tests with **Vitest** and React Testing Library.

- **Backend (`/backend`)**:
  - Built with **Django** and **Django REST Framework**.
  - **Apps**: Organized into `user`, `weather`, and the new `personalization` app.
  - **Database**: PostgreSQL.
  - **Testing**: `unittest` framework for comprehensive backend testing.
  - **API Routing**: Endpoints are versioned under `/api/v1/`.

---

## Deployment
- Containers pushed to Oracle Cloud Registry

- Oracle Cloud Run / Compute serves backend & frontend

- Namecheap domain www.tms‑v.com points to the load balancer

- Backend uses PostgreSQL on a managed instance

- SSL/TLS configured at load‑balancer level

- **CI/CD**:
  - GitHub Actions workflow automatically runs tests, builds Docker images, pushes to Docker Hub, and redeploys to the server when merging into `main`.

---

## API Endpoints

### User (`/api/v1/user/`)

| Path               | Method      | Auth    | Description                                    |
|--------------------|-------------|---------|------------------------------------------------|
| `register/`        | POST        | Public  | Create user & profile, return token            |
| `login/`           | POST        | Public  | Obtain auth token                              |
| `logout/`          | POST        | Token   | Invalidate token                               |
| `profile/`         | GET / PUT   | Token   | Retrieve or update user profile                |
| `delete_account/`  | DELETE      | Token   | Delete account with email confirmation         |

### Weather (`/api/v1/weather/`)

| Path            | Method             | Auth      | Description                                        |
|-----------------|--------------------|-----------|----------------------------------------------------|
| `favorites/`    | GET / POST / DELETE| Token     | List, add, or remove favorite locations            |
| `current/`      | GET                | Optional  | Fetch current weather (by city or geolocation)     |
| `forecast/`     | GET                | Optional  | Retrieve multi‑day forecast                        |
| `alerts/`       | GET                | Token     | Get weather alerts for city or profile location    |
| `news/`         | GET                | Token     | Fetch weather‑related news for a specified city    |

### Personalization (`/api/v1/personalization/`)

| Path                  | Method      | Auth      | Description                                        |
|-----------------------|-------------|-----------|----------------------------------------------------|
| `suggest-outfit/`     | POST        | Optional  | Get an AI-powered outfit suggestion                |
| `outfit-feedback/`    | POST        | Token     | Submit like/dislike feedback on suggestions        |


---

## Tech Stack
- Python 3.11, Django 4.x, Django REST Framework

- React 19, Vite, TypeScript, Leaflet, react‑slick

- PostgreSQL, Gunicorn, WhiteNoise

- Docker, docker‑compose

- Oracle Cloud, Namecheap DNS


## License

This project is licensed under the [MIT License](./LICENSE).  
&copy; 2025 Efthymios Vavritsas
