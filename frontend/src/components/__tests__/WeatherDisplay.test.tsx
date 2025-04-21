import { render, screen } from '@testing-library/react';
 import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
 import '@testing-library/jest-dom';
 import WeatherDisplay from '../WeatherDisplay';
 
 // Mock toLocaleTimeString for consistent output
 beforeEach(() => {
   vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('06:00 AM');
 });
 afterEach(() => {
   vi.restoreAllMocks();
 });
 
 describe('WeatherDisplay', () => {
   test('shows no-data message when data.weather is missing', () => {
     render(<WeatherDisplay title="Weather" data={{}} unit="C" />);
     expect(screen.getByText('No weather data available')).toBeInTheDocument();
   });
 
   test('shows no-data message when weather array is empty', () => {
     const data = { weather: [], main: { temp: 10 }, wind: { speed: 1 }, sys: { sunrise: 0, sunset: 0 }, name: 'EmptyCity' };
     render(<WeatherDisplay title="Weather" data={data} unit="C" />);
     expect(screen.getByText('No weather data available')).toBeInTheDocument();
   });
 
   test('renders minimal info when main, wind, and sys are missing', () => {
     const data = { weather: [{ icon: '01d', description: 'desc' }], name: 'MinimalCity' };
     render(<WeatherDisplay title="Minimal" data={data} unit="C" />);
 
     // Should render title, icon & description
     expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Minimal in MinimalCity');
     expect(screen.getByAltText('desc')).toBeInTheDocument();
     expect(screen.getByText('desc')).toBeInTheDocument();
 
     // Should not render temperature or details
     expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
     expect(screen.queryByText('Wind Speed:')).not.toBeInTheDocument();
     expect(screen.queryByText('Sunrise:')).not.toBeInTheDocument();
   });
 
   test('omits wind info when wind data is missing', () => {
     const data = {
       weather: [{ icon: '03d', description: 'cloud' }],
       main: { temp: 15, feels_like: 14, temp_min: 10, temp_max: 20, humidity: 60 },
       sys: { sunrise: 1600000000, sunset: 1600040000 },
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
 
   test('omits sunrise/sunset when sys data is missing', () => {
     const data = {
       weather: [{ icon: '04d', description: 'overcast' }],
       main: { temp: 18, feels_like: 17, temp_min: 16, temp_max: 19, humidity: 55 },
       wind: { speed: 3 },
       name: 'NoSysCity',
     };
     render(<WeatherDisplay title="No Sys" data={data} unit="C" />);
 
     expect(screen.getByText('18.0°C')).toBeInTheDocument();
     expect(screen.getByText('Wind Speed:')).toBeInTheDocument();
     expect(screen.queryByText('Sunrise:')).not.toBeInTheDocument();
     expect(screen.queryByText('Sunset:')).not.toBeInTheDocument();
   });
 
   test('renders weather info in Celsius correctly', () => {
     const data = {
       weather: [{ icon: '01d', description: 'clear sky' }],
       main: { temp: 20, feels_like: 18, temp_min: 15, temp_max: 25, humidity: 50 },
       wind: { speed: 5 },
       sys: { sunrise: 1600000000, sunset: 1600040000 },
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
     const data = {
       weather: [{ icon: '02n', description: 'few clouds' }],
       main: { temp: 77, feels_like: 75, temp_min: 70, temp_max: 80, humidity: 65 },
       wind: { speed: 10 },
       sys: { sunrise: 1600000000, sunset: 1600040000 },
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
     const data = { weather: [{ icon: '10d', description: 'rain' }], name: 'IconCity' };
     render(<WeatherDisplay title="Icon Test" data={data} unit="C" />);
     const img = screen.getByAltText('rain') as HTMLImageElement;
     expect(img.src).toBe('http://openweathermap.org/img/wn/10d@2x.png');
   });
 
   test('formats temperatures and wind speeds with one decimal place', () => {
     const data = {
       weather: [{ icon: '01d', description: 'test' }],
       main: { temp: 20.123, feels_like: 18.456, temp_min: 15.789, temp_max: 25.321, humidity: 50 },
       wind: { speed: 5.678 },
       sys: { sunrise: 0, sunset: 0 },
       name: 'PrecisionCity',
     };
     render(<WeatherDisplay title="Precision" data={data} unit="C" />);
     expect(screen.getByText('20.1°C')).toBeInTheDocument();
     expect(screen.getByText('Feels Like:').parentElement).toHaveTextContent('18.5°C');
     expect(screen.getByText('Wind Speed:').parentElement).toHaveTextContent('5.7 m/s');
   });
 
   test('data.weather null yields no-data message', () => {
     const data = { weather: null, main: { temp: 10 }, wind: { speed: 2 }, sys: { sunrise: 0, sunset: 0 }, name: 'NullCity' };
     render(<WeatherDisplay title="Null" data={data} unit="C" />);
     expect(screen.getByText('No weather data available')).toBeInTheDocument();
   });
 
   test('ignores additional weather entries and uses only first', () => {
     const data = {
       weather: [
         { icon: 'abc', description: 'firstdesc' },
         { icon: 'def', description: 'seconddesc' },
       ],
       main: { temp: 1, feels_like: 1, temp_min: 1, temp_max: 1, humidity: 1 },
       wind: { speed: 1 },
       sys: { sunrise: 0, sunset: 0 },
       name: 'ArrayCity',
     };
     render(<WeatherDisplay title="Array" data={data} unit="C" />);
     const firstImg = screen.getByAltText('firstdesc') as HTMLImageElement;
     expect(firstImg.src).toContain('abc@2x.png');
     expect(screen.queryByAltText('seconddesc')).not.toBeInTheDocument();
   });
 
   test('calls toLocaleTimeString exactly twice for sunrise and sunset', () => {
     // restore default spy from beforeEach
     vi.restoreAllMocks();
     const spy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('TIME');
     const data = {
       weather: [{ icon: '01d', description: 'clear sky' }],
       main: { temp: 20, feels_like: 18, temp_min: 15, temp_max: 25, humidity: 50 },
       wind: { speed: 5 },
       sys: { sunrise: 1600000000, sunset: 1600040000 },
       name: 'CountCity',
     };
     render(<WeatherDisplay title="Count" data={data} unit="C" />);
     expect(spy).toHaveBeenCalledTimes(2);
   });
 
   test('applies correct classes for weather card elements', () => {
     const data = {
       weather: [{ icon: '01d', description: 'sky' }],
       main: { temp: 10, feels_like: 9, temp_min: 8, temp_max: 12, humidity: 80 },
       wind: { speed: 2 },
       sys: { sunrise: 0, sunset: 0 },
       name: 'ClassCity',
     };
     const { container } = render(<WeatherDisplay title="Class Test" data={data} unit="C" />);
     expect(container.querySelector('.weather-card')).toBeInTheDocument();
     expect(container.querySelector('.weather-card-mobile-active')).toBeInTheDocument();
     expect(container.querySelector('.weather-temp')).toBeInTheDocument();
   });
 
   test('does not render weather-temp div when main data is missing', () => {
     const data = {
       weather: [{ icon: '01d', description: 'no main' }],
       wind: { speed: 3 },
       sys: { sunrise: 0, sunset: 0 },
       name: 'NoMainCity',
     };
     const { container } = render(<WeatherDisplay title="NoMain" data={data} unit="C" />);
     expect(container.querySelector('.weather-temp')).toBeNull();
   });
 
   test('renders image with empty alt when description is empty', () => {
     const data = {
       weather: [{ icon: 'zzz', description: '' }],
       name: 'AltCity',
     };
     render(<WeatherDisplay title="Alt Test" data={data} unit="C" />);
     const img = screen.getByAltText('') as HTMLImageElement;
     expect(img).toHaveAttribute('src', 'http://openweathermap.org/img/wn/zzz@2x.png');
   });
 
 });