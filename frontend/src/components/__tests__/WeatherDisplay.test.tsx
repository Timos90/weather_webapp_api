import { render, screen } from '@testing-library/react';
 import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
 import '@testing-library/jest-dom';
 import WeatherDisplay from '../WeatherDisplay';
import { APICurrentWeather } from '../../types/types';
 
 // Mock toLocaleTimeString for consistent output
 beforeEach(() => {
   vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('06:00 AM');
 });
 afterEach(() => {
   vi.restoreAllMocks();
 });
 
 describe('WeatherDisplay', () => {
  const baseMockAPIData: APICurrentWeather = {
    coord: { lon: 0, lat: 0 },
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
    base: 'stations',
    main: { temp: 25, feels_like: 25, temp_min: 20, temp_max: 30, pressure: 1012, humidity: 50 },
    visibility: 10000,
    wind: { speed: 2, deg: 180 },
    clouds: { all: 0 },
    dt: Math.floor(Date.now() / 1000),
    sys: { type: 1, id: 1234, country: 'GB', sunrise: Math.floor(Date.now() / 1000) - 7200, sunset: Math.floor(Date.now() / 1000) + 7200 },
    timezone: 3600,
    id: 2643743,
    name: 'Test City',
    cod: 200,
  };

  test('shows no-data message when data.weather is missing', () => {
    render(<WeatherDisplay title="Weather" data={{} as APICurrentWeather} unit="C" />);
    expect(screen.getByText('Weather data currently unavailable')).toBeInTheDocument();
  });

  test('shows no-data message when weather array is empty', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [], // Empty weather array
      main: { ...baseMockAPIData.main, temp: 10 },
      wind: { ...baseMockAPIData.wind, speed: 10 },
      sys: { ...baseMockAPIData.sys, sunrise: 0, sunset: 0, country: 'GB' },
    };
    render(<WeatherDisplay title="Weather" data={data} unit="C" />);
    expect(screen.getByText('Weather data currently unavailable')).toBeInTheDocument();
  });

  test('renders "Weather data currently unavailable" when main is missing', () => {
    const dataWithMissingMain: Partial<APICurrentWeather> = {
      ...baseMockAPIData,
      weather: [{ icon: '01d', description: 'desc', id: 800, main: 'Clear' }],
      // main is intentionally omitted or explicitly deleted below
    };
    delete (dataWithMissingMain as any).main; // Ensure main is completely removed
    render(<WeatherDisplay title="Missing Main" data={dataWithMissingMain as APICurrentWeather} unit="C" />);
    expect(screen.getByText('Weather data currently unavailable')).toBeInTheDocument();
  });

  test('renders "Weather data currently unavailable" when sys is missing (from formerly combined test)', () => {
    const dataWithMissingSys: Partial<APICurrentWeather> = {
      ...baseMockAPIData,
      weather: [{ icon: '01d', description: 'desc', id: 800, main: 'Clear' }],
      main: { ...baseMockAPIData.main, temp: 10 },
    };
    delete (dataWithMissingSys as any).sys; // Ensure sys is completely removed
    render(<WeatherDisplay title="Missing Sys" data={dataWithMissingSys as APICurrentWeather} unit="C" />);
    expect(screen.getByText('Weather data currently unavailable')).toBeInTheDocument();
  });

  test('omits wind info when wind data is missing', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [{ icon: '03d', description: 'cloud', id: 802, main: 'Clouds' }],
      main: { ...baseMockAPIData.main, temp: 15, feels_like: 14, temp_min: 10, temp_max: 20, humidity: 60 },
      sys: { ...baseMockAPIData.sys, sunrise: 1600000000, sunset: 1600040000 },
      wind: undefined as any, // Wind is missing for this test
      name: 'NoWindCity',
    };
    render(<WeatherDisplay title="No Wind" data={data} unit="C" />);
    expect(screen.getByText('15.0°C')).toBeInTheDocument();
    expect(screen.queryByText('Wind Speed:')).not.toBeInTheDocument();

    const sunriseLabel = screen.getByText('Sunrise:');
    expect(sunriseLabel.parentElement).toHaveTextContent('Sunrise: 06:00 AM');
    const sunsetLabel = screen.getByText('Sunset:');
    expect(sunsetLabel.parentElement).toHaveTextContent('Sunset: 06:00 AM');
  });

  test('renders "Weather data currently unavailable" when sys data is missing for APICurrentWeather', () => {
    const dataMissingSys: Partial<APICurrentWeather> = {
      ...baseMockAPIData,
      weather: [{ icon: '01d', description: 'desc', id: 800, main: 'Clear' }],
      main: { ...baseMockAPIData.main, temp: 18 },
      wind: { ...baseMockAPIData.wind, speed: 5 },
      // sys is intentionally omitted or explicitly deleted below
    };
    delete (dataMissingSys as any).sys; // Ensure sys is completely removed
    render(<WeatherDisplay title="No Sys" data={dataMissingSys as APICurrentWeather} unit="C" />);
    expect(screen.getByText('Weather data currently unavailable')).toBeInTheDocument();
    expect(screen.queryByText('18.0°C')).not.toBeInTheDocument();
    expect(screen.queryByText('Sunrise:')).not.toBeInTheDocument();
  });

  test('renders weather info in Celsius correctly', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [{ icon: '01d', description: 'clear sky', id: 800, main: 'Clear' }],
      main: { ...baseMockAPIData.main, temp: 20, feels_like: 18, temp_min: 15, temp_max: 25, humidity: 50 },
      wind: { ...baseMockAPIData.wind, speed: 5 },
      sys: { ...baseMockAPIData.sys, sunrise: 1600000000, sunset: 1600040000 },
      name: 'TestCity',
    };

    const { container } = render(<WeatherDisplay title="Current Weather" data={data} unit="C" />);

    // Header and title
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Current Weather in TestCity');

    // Temperature, icon & description
    expect(screen.getByText('20.0°C')).toBeInTheDocument();
    const img = screen.getByAltText('clear sky') as HTMLImageElement;
    expect(img.src).toContain('01d@2x.png');
    expect(screen.getByText('clear sky')).toBeInTheDocument();

    // Details sections
    expect(container.getElementsByClassName('weather-details').length).toBeGreaterThan(1);
  });

  test('renders wind speed and temperature unit correctly in Fahrenheit', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [{ icon: '02n', description: 'few clouds', id: 801, main: 'Clouds' }],
      main: { ...baseMockAPIData.main, temp: 77, feels_like: 75, temp_min: 70, temp_max: 80, humidity: 65 },
      wind: { ...baseMockAPIData.wind, speed: 10 },
      sys: { ...baseMockAPIData.sys, sunrise: 1600000000, sunset: 1600040000 },
      name: 'FahrenheitCity',
    };
    render(<WeatherDisplay title="Weather Report" data={data} unit="F" />);

    // Temperature suffix
    expect(screen.getByText('77.0°F')).toBeInTheDocument();

    // Wind speed label
    const windLabel = screen.getByText('Wind Speed:');
    expect(windLabel.parentElement).toHaveTextContent('Wind Speed: 10.0 mph');
  });

  test('uses correct img src URL for weather icon', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [{ icon: '10d', description: 'rain', id: 500, main: 'Rain' }],
      main: { ...baseMockAPIData.main, temp: 10 },
      sys: { ...baseMockAPIData.sys, country: 'GB', sunrise: 1609459200, sunset: 1609488000 },
      name: 'City'
    };
    render(<WeatherDisplay title="Icon Test" data={data} unit="C" />);
    const img = screen.getByAltText('rain') as HTMLImageElement;
    expect(img.src).toBe('http://openweathermap.org/img/wn/10d@2x.png');
  });

  test('formats temperatures and wind speeds with one decimal place', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [{ icon: '01d', description: 'test', id: 800, main: 'Clear' }],
      main: { ...baseMockAPIData.main, temp: 20.123, feels_like: 18.456, temp_min: 15.789, temp_max: 25.321, humidity: 50 },
      wind: { ...baseMockAPIData.wind, speed: 5.678 },
      sys: { ...baseMockAPIData.sys, sunrise: 0, sunset: 0 },
      name: 'PrecisionCity',
    };
    render(<WeatherDisplay title="Precision" data={data} unit="C" />);
    expect(screen.getByText('20.1°C')).toBeInTheDocument();
    expect(screen.getByText('Feels Like:').parentElement).toHaveTextContent('18.5°C');
    expect(screen.getByText('Wind Speed:').parentElement).toHaveTextContent('5.7 m/s');
  });

  test('data.weather null yields "Weather data currently unavailable"', () => {
    const dataWithNullWeather = {
      ...baseMockAPIData,
      weather: null as any, // weather is null
      main: { ...baseMockAPIData.main, temp: 10 },
      wind: { ...baseMockAPIData.wind, speed: 10 },
      sys: { ...baseMockAPIData.sys, sunrise: 0, sunset: 0, country: 'GB' },
    } as APICurrentWeather;
    render(<WeatherDisplay title="Null Weather" data={dataWithNullWeather} unit="C" />);
    expect(screen.getByText('Weather data currently unavailable')).toBeInTheDocument();
  });

  test('ignores additional weather entries and uses only first', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [
        { icon: 'abc', description: 'firstdesc', id: 800, main: 'Clear' },
        { icon: 'def', description: 'seconddesc', id: 801, main: 'Clouds' },
      ],
      main: { ...baseMockAPIData.main, temp: 1, feels_like: 1, temp_min: 1, temp_max: 1, humidity: 1 },
      wind: { ...baseMockAPIData.wind, speed: 1 },
      sys: { ...baseMockAPIData.sys, sunrise: 0, sunset: 0 },
      name: 'ArrayCity',
    };
    render(<WeatherDisplay title="Array" data={data} unit="C" />);
    const firstImg = screen.getByAltText('firstdesc') as HTMLImageElement;
    expect(firstImg.src).toContain('abc@2x.png');
    expect(screen.queryByAltText('seconddesc')).not.toBeInTheDocument();
  });

  test('renders image with empty alt when description is empty', () => {
    const data: APICurrentWeather = {
      ...baseMockAPIData,
      weather: [{ icon: '01d', description: '', id: 800, main: 'Clear' }], // Empty description
      main: { ...baseMockAPIData.main, temp: 10 },
      sys: { ...baseMockAPIData.sys, country: 'GB', sunrise: 1609459200, sunset: 1609488000 },
      name: 'City'
    };
    render(<WeatherDisplay title="Alt Test" data={data} unit="C" />);
    const img = screen.getByAltText('') as HTMLImageElement;
    expect(img).toHaveAttribute('src', 'http://openweathermap.org/img/wn/01d@2x.png');
  });
});
