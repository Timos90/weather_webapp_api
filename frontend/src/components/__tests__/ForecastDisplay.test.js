// ForecastDisplay.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ForecastDisplay from '../ForecastDisplay';

describe('ForecastDisplay Component', () => {
  const sampleForecastData = [
    {
      day_name: 'Today',
      date: '2025-04-09',
      uv_index: 5,
      sunrise: '06:00 AM',
      sunset: '08:00 PM',
      forecasts: [
        {
          datetime: '2025-04-09 06:00:00',
          temperature: 10,
          feels_like: 9,
          temp_min: 8,
          temp_max: 12,
          humidity: 80,
          wind_speed: 3,
          weather_description: 'clear sky',
          weather_icon: '01d',
        },
        {
          datetime: '2025-04-09 12:00:00',
          temperature: 15,
          feels_like: 15,
          temp_min: 14,
          temp_max: 16,
          humidity: 70,
          wind_speed: 4,
          weather_description: 'few clouds',
          weather_icon: '02d',
        },
      ],
    },
    {
      day_name: 'Tomorrow',
      date: '2025-04-10',
      uv_index: 6,
      sunrise: '06:05 AM',
      sunset: '08:02 PM',
      forecasts: [
        {
          datetime: '2025-04-10 06:00:00',
          temperature: 11,
          feels_like: 10,
          temp_min: 9,
          temp_max: 13,
          humidity: 75,
          wind_speed: 3,
          weather_description: 'scattered clouds',
          weather_icon: '03d',
        },
      ],
    },
  ];

  test('renders fallback message when no forecast data is provided', () => {
    render(<ForecastDisplay data={[]} unit="C" />);
    expect(screen.getByText(/No forecast data available/i)).toBeInTheDocument();
  });

  test('renders forecast tabs and forecast items correctly', () => {
    render(<ForecastDisplay data={sampleForecastData} unit="C" />);
    // Check for header text
    expect(screen.getByText(/5-Day Forecast/i)).toBeInTheDocument();
    // Check that tabs display day names
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Tomorrow/i)).toBeInTheDocument();
    // Check for a forecast time from the first day's data (the row shows only 06:00)
    expect(screen.getByText('06:00')).toBeInTheDocument();
    // Check for the weather description "clear sky"
    expect(screen.getByText(/clear sky/i)).toBeInTheDocument();
  });

  test('switches forecast tabs when clicked', () => {
    render(<ForecastDisplay data={sampleForecastData} unit="C" />);
    // Initially, the "Today" forecasts are displayed.
    expect(screen.getByText(/clear sky/i)).toBeInTheDocument();

    // Click on the "Tomorrow" tab.
    fireEvent.click(screen.getByText(/Tomorrow/i));

    // Now, the forecast description from Tomorrow should be visible.
    expect(screen.getByText(/scattered clouds/i)).toBeInTheDocument();
  });

  test('toggles forecast item expansion on click', () => {
    render(<ForecastDisplay data={sampleForecastData} unit="C" />);
    // Get the forecast item by using its time text, then get the closest element with class "forecast-item"
    const forecastItem = screen.getByText('06:00').closest('.forecast-item');
    expect(forecastItem).toBeInTheDocument();

    // Verify overlay details are not visible initially.
    expect(screen.queryByText(/Feels Like:/i)).not.toBeInTheDocument();

    // Click the forecast item to expand it.
    if (forecastItem) {
      fireEvent.click(forecastItem);
    }

    // Now the overlay details should appear.
    expect(screen.getByText(/Feels Like:/i)).toBeInTheDocument();
  });
});
