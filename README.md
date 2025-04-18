# Weather App

Live demo: [www.tms‑v.com](https://www.tms‑v.com)

## Overview

Weather_webapp_api is a full‑stack weather web application that lets users look up current conditions, multi‑day forecasts, weather news and alerts, manage favorite locations, and personalize their settings. It’s built with:

- **Backend**: Django + Django REST Framework, token‑based auth  
- **Frontend**: React (Vite + TypeScript), Tailwind‑inspired CSS  
- **APIs**: OpenWeatherMap, NewsAPI, WeatherAPI  
- **Testing**: Python `unittest` (backend), Jest (frontend)  
- **Deployment**: Docker containers on Oracle Cloud with a Namecheap domain  

---

## Key Features

- **User Management**  
  - Registration, Login & Logout (DRF token auth)  
  - Profile CRUD: username, email, name, location, preferred units  
  - Account deletion with email confirmation  

- **Favorites**  
  - Add/remove cities to your favorites list  
  - Persisted per‑user via `FavoriteLocation` model  

- **Weather Data**  
  - **Current weather** by city name or geolocation  
  - **5‑day / 3‑hourly forecast**, with UV index, sunrise/sunset  
  - **Live weather map** using Leaflet + OpenWeatherMap tile layers  

- **Alerts & News**  
  - Fetch severe weather alerts (WeatherAPI)  
  - Pull weather‑related news articles (NewsAPI)  
  - Filter articles by multi‑language weather keywords  

- **Responsive UI**  
  - Desktop layouts (mobile not yet full build)
  - Interactive modals for login, registration, profile, alerts  
  - Animated “trash can” delete buttons  

---


- **Frontend**  
  - `src/pages/HomePage.tsx`: main layout & data orchestration  
  - `src/components/*`: modular UI (WeatherDisplay, ForecastDisplay, NewsDisplay, MapComponent, Modals…)  
  - `src/api/*`: `weather.ts`, `user.ts`, `apiHelpers.ts` wrap REST endpoints  
  - Type definitions in `src/types/types.ts`  
  - Styling via scoped CSS modules (glassmorphism, responsive grids)  

- **Backend**  
  - `apps/user/`: auth, profile, registration, token endpoints  
  - `apps/weather/`: favorites, current, forecast, alerts, news serializers & views  
  - Models: `UserProfile` (1‑1 to Django User), `FavoriteLocation`  
  - Validation: DRF serializers & custom validators  
  - URL routing under `/api/user/` and `/api/weather/`  

---


## Deployment
- Containers pushed to Oracle Cloud Registry

- Oracle Cloud Run / Compute serves backend & frontend

- Namecheap domain www.tms‑v.com points to the load balancer

- Backend uses PostgreSQL on a managed instance

- SSL/TLS configured at load‑balancer level


---

## API Endpoints

### User (`/api/user/`)

| Path               | Method      | Auth    | Description                                    |
|--------------------|-------------|---------|------------------------------------------------|
| `register/`        | POST        | Public  | Create user & profile, return token            |
| `login/`           | POST        | Public  | Obtain auth token                              |
| `logout/`          | POST        | Token   | Invalidate token                               |
| `profile/`         | GET / PUT   | Token   | Retrieve or update user profile                |
| `delete_account/`  | DELETE      | Token   | Delete account with email confirmation         |

### Weather (`/api/weather/`)

| Path            | Method             | Auth      | Description                                        |
|-----------------|--------------------|-----------|----------------------------------------------------|
| `favorites/`    | GET / POST / DELETE| Token     | List, add, or remove favorite locations            |
| `current/`      | GET                | Optional  | Fetch current weather (by city or geolocation)     |
| `forecast/`     | GET                | Optional  | Retrieve multi‑day forecast                        |
| `alerts/`       | GET                | Token     | Get weather alerts for city or profile location    |
| `news/`         | GET                | Token     | Fetch weather‑related news for a specified city    |


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
