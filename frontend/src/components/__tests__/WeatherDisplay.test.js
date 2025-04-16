// WeatherDisplay.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import WeatherDisplay from '../WeatherDisplay';

describe('WeatherDisplay Component', () => {
  const mockData = {
    weather: [{ icon: '01d', description: 'Clear sky' }],
    main: { temp: 25.123, feels_like: 26.456, temp_min: 23.0, temp_max: 28.0, humidity: 50 },
    wind: { speed: 3.5 },
    sys: { sunrise: 1600000000, sunset: 1600030000 },
    name: 'Test City'
  };

  it('renders weather details when data is provided', () => {
    render(<WeatherDisplay title="Current Weather" data={mockData} unit="C" />);

    // Check header includes title and the location name
    expect(screen.getByText(/Current Weather in Test City/i)).toBeInTheDocument();

    // The image should have the correct alt text from the weather description.
    expect(screen.getByAltText(/Clear sky/i)).toBeInTheDocument();

    // Check that the temperature is formatted correctly
    expect(screen.getByText('25.1°C')).toBeInTheDocument();

    // Optionally check for wind and humidity texts
    expect(screen.getByText(/3.5 m\/s/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/i)).toBeInTheDocument();
  });

  it('renders fallback message when data is not provided', () => {
    render(<WeatherDisplay title="Current Weather" data={null} unit="C" />);
    expect(screen.getByText(/No weather data available/i)).toBeInTheDocument();
  });
});
