// src/components/__tests__/HomePage.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '../../pages/HomePage';

// Explicitly mock the API modules.
jest.mock('../../api/weather', () => ({
  fetchCurrentWeather: jest.fn(),
  fetchForecast: jest.fn(),
  fetchCoordinates: jest.fn(),
  fetchNews: jest.fn(),
  fetchFavoriteLocations: jest.fn(),
  addToFavorites: jest.fn(),
  removeFromFavorites: jest.fn(),
}));

jest.mock('../../api/user', () => ({
  fetchUserProfile: jest.fn(),
}));

// Import the mocked modules so we can configure their behavior in tests.
import * as weatherApi from '../../api/weather';
import * as userApi from '../../api/user';

// Define sample data for our tests.
const sampleCurrentWeather = {
  sys: { country: 'TC' },
  name: 'Test City',
  weather: [{ icon: '01d', description: 'clear sky' }],
  main: { temp: 20, feels_like: 18, temp_min: 15, temp_max: 22, humidity: 50 },
  wind: { speed: 5 },
};

const sampleForecast = [
  {
    day_name: 'Monday',
    date: '1/1/2025',
    forecasts: [
      { 
        datetime: '2025-01-01 12:00:00',
        temperature: 20,
        weather_icon: '01d',
        weather_description: 'clear sky',
        feels_like: 18,
        temp_min: 15,
        temp_max: 22,
        humidity: 50,
        wind_speed: 5,
      },
    ],
    uv_index: 5,
    sunrise: '06:00 AM',
    sunset: '08:00 PM',
  },
];

const sampleNews = []; // Provide sample news articles if needed.
const sampleCoordinates = { lat: 10, lon: 20 };

describe('HomePage Component (Authenticated scenario)', () => {
  beforeEach(() => {
    // Simulate an authenticated user.
    localStorage.setItem('auth_token', 'dummy-token');

    // Stub geolocation API.
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn().mockImplementation((success) =>
        success({ coords: { latitude: 10, longitude: 20 } })
      ),
    };

    // Configure our API mocks.
    weatherApi.fetchCurrentWeather.mockResolvedValue(sampleCurrentWeather);
    weatherApi.fetchForecast.mockResolvedValue(sampleForecast);
    weatherApi.fetchCoordinates.mockResolvedValue(sampleCoordinates);
    weatherApi.fetchNews.mockResolvedValue(sampleNews);
    weatherApi.fetchFavoriteLocations.mockResolvedValue([
      { id: 1, city_name: 'Test City', country_code: 'TC' },
    ]);
    userApi.fetchUserProfile.mockResolvedValue({
      preferred_temperature_unit: 'C',
      user: {
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      },
      location: 'Test City',
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders the authenticated layout with NavBar, AlertsButton, and grid cards', async () => {
    render(<HomePage />);

    // Wait for the current weather header to appear.
    await waitFor(() => {
      expect(screen.getByText(/Current Weather in Test City/i)).toBeInTheDocument();
    });

    // Verify that the alerts button and forecast header are rendered.
    expect(screen.getByRole('button', { name: /Alerts/i })).toBeInTheDocument();
    expect(screen.getByText(/5-Day Forecast/i)).toBeInTheDocument();
  });
});
