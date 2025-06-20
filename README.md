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

## What's New in v1.0.0: The AI Personalization Update

This major update transitions the application from a standard weather utility to a personalized, AI-powered weather companion. The core logic for suggestions has been moved from the frontend to a robust Django backend, enabling more sophisticated and context-aware features.

- **AI-Powered Outfit Advisor**: A new modal on the homepage provides dynamic outfit suggestions.
  - **Context-Aware Logic**: Suggestions are tailored based on weather (temperature, precipitation, UV index), time of day, user-provided occasion (e.g., "casual outing," "work"), and user gender.
  - **Learns from Feedback**: The system learns from user "likes" and "dislikes" on suggested items to improve future recommendations. Feedback is analyzed for different weather conditions and alerts.
  - **Intelligent Shoe Logic**: A sophisticated system ensures only one, context-appropriate pair of shoes is suggested (e.g., sandals for warm casual outings, waterproof shoes for rain).

- **Backend Overhaul & New Personalization API**:
  - **New `personalization` App**: A dedicated Django app now houses all the AI logic.
  - **New API Endpoints**:
    - `POST /api/v1/personalization/suggest-outfit/`: Takes weather and occasion data, returns a full outfit suggestion.
    - `POST /api/v1/personalization/outfit-feedback/`: Collects user feedback to train the suggestion model.
  - **Automated Feedback Analysis**: A background cron job runs periodically within the Docker container to process and analyze user feedback.
  - **News Deduplication**: The news feed logic now intelligently removes duplicate articles fetched from different sources.

- **Frontend Enhancements**:
  - **OutfitAdvisor Integration**: The `OutfitAdvisor` component is now fully integrated into the homepage, calling the new backend API.
  - **Refactored API Layer**: All frontend `fetch` calls have been migrated to `axios` for more robust data fetching.
  - **Improved Documentation**: Completed JSDoc for all major React components, enhancing maintainability.

- **Notable Fixes & Improvements**:
  - **Refined Suggestion Logic**: Corrected order of operations for applying feedback (temperature-based, alert-specific) and improved consistency of advice strings in `suggest_outfit_py`.
  - **Deterministic Outfit Suggestions**: Removed random elements from core suggestion logic to ensure consistent outputs for given inputs, crucial for reliable testing and behavior.
  - **Enhanced Shoe Selection**: Made shoe consistency logic more robust and context-aware, particularly for casual and warm weather scenarios.
  - **Backend Test Stability**: Resolved `TypeError` issues and improved mocking in `apps/personalization/tests/test_outfit_logic.py`.
  - **Frontend Stability**: Updated type guards in `WeatherDisplay.tsx` for more reliable weather data rendering.
  - **User Profile Enhancement**: Integrated an optional 'gender' field into user profiles, allowing for more tailored suggestions.
  - **Developer Experience**: Added new `make` commands (e.g., `dev-test-personalization`) for streamlined testing of specific app modules.

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
