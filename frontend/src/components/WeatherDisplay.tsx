import React from 'react';
import '../css/WeatherDisplay.css';
import { WeatherDisplayProps, APICurrentWeather, ForecastSlot } from '../types/types';


/**
 * Displays weather information in a card format.
 * It shows temperature, weather conditions (icon and description), humidity, wind speed,
 * sunrise, and sunset times for a specific location.
 *
 * @param {WeatherDisplayProps} props - The props for the component.
 * @param {string} props.title - A title for the weather display section (e.g., "Current Weather").
 * @param {APICurrentWeather | ForecastSlot | undefined} props.data - The weather data object.
 * @param {'C' | 'F'} props.unit - The temperature unit to display ('C' for Celsius, 'F' for Fahrenheit).
 * @returns {React.ReactElement | null} The weather display card or a 'no data' message.
 */
const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ title, data, unit, displayedLocationName }) => {
  if (!data) {
    return <div className="no-data">No weather data available</div>;
  }

  // Type guards
  const isAPICurrentWeatherData = (d: any): d is APICurrentWeather =>
    d &&
    typeof d === 'object' &&
    d.main && typeof d.main.temp === 'number' && // Ensures main exists and main.temp is a number
    d.sys && typeof d.sys.sunrise === 'number' && // Ensures sys exists and sys.sunrise is a number
    Array.isArray(d.weather) && d.weather.length > 0 &&
    d.weather[0] &&
    typeof d.weather[0].icon === 'string' && // Ensures icon is a string
    typeof d.weather[0].description === 'string'; // Ensures description is a string (can be empty)

  const isForecastSlotData = (d: any): d is ForecastSlot =>
    d &&
    typeof d === 'object' &&
    typeof d.datetime === 'number' &&
    typeof d.temperature === 'number' &&
    typeof d.weather_icon === 'string' &&
    typeof d.weather_description === 'string' &&
    !('sys' in d);

  

  /**
   * Formats a temperature value according to the selected unit.
   * @param {number} temp - The temperature value.
   * @returns {string} The formatted temperature string (e.g., "25.0°C").
   */
  const formatTemperature = (temp: number) => {
    const suffix = unit === 'C' ? '°C' : '°F';
    return `${temp.toFixed(1)}${suffix}`;
  };

  /**
   * Formats a wind speed value according to the selected unit.
   * Metric (Celsius) uses m/s, Imperial (Fahrenheit) uses mph.
   * @param {number} speed - The wind speed value.
   * @returns {string} The formatted wind speed string (e.g., "5.0 m/s").
   */
  const formatWindSpeed = (speed: number) => {
    const label = unit === 'C' ? 'm/s' : 'mph';
    return `${speed.toFixed(1)} ${label}`;
  };

  let cardContent: React.ReactNode = <div className="no-data">Weather data currently unavailable</div>;

  if (isAPICurrentWeatherData(data)) {
    const { main, weather, wind, sys, name: apiNameFromData } = data;
    const currentWeatherData = weather[0];

    const temp = main.temp; // For use in formatTemperature, etc.
    const weatherIcon = currentWeatherData.icon;
    const weatherDescription = currentWeatherData.description;

    // isAPICurrentWeatherData already ensures main.temp is a number and other critical fields exist.
      const feelsLike = main.feels_like;
      const tempMin = main.temp_min;
      const tempMax = main.temp_max;
      const humidity = main.humidity;
      const windSpeed = wind?.speed; // wind can be optional
      const sunrise = sys.sunrise;
      const sunset = sys.sunset;
      const locationNameToDisplay = displayedLocationName || apiNameFromData || '';

      cardContent = (
        <div className="weather-card weather-card-mobile weather-card-mobile-active">
          <header className="weather-header">
            <h2>{title}{locationNameToDisplay ? ` in ${locationNameToDisplay}` : ''}</h2>
          </header>
          <div className="weather-icon-temp">
            <div className="weather-temp">{formatTemperature(temp)}</div>
            <div className="weather-icon">
              <img
                src={`http://openweathermap.org/img/wn/${weatherIcon}@2x.png`}
                alt={weatherDescription}
              />
            </div>
          </div>
          <div className="weather-description">{weatherDescription}</div>
          <section className="weather-info weather-info-active">
            {(typeof feelsLike === 'number' || typeof tempMin === 'number' || typeof humidity === 'number') && (
              <div className="weather-details">
                {typeof feelsLike === 'number' && <p><strong>Feels Like:</strong> {formatTemperature(feelsLike)}</p>}
                {typeof tempMin === 'number' && typeof tempMax === 'number' && <p><strong>Min-Max:</strong> {formatTemperature(tempMin)} - {formatTemperature(tempMax)}</p>}
                {typeof humidity === 'number' && <p><strong>Humidity:</strong> {humidity}%</p>}
              </div>
            )}
            {typeof windSpeed === 'number' && (
              <div className="weather-details">
                <p><strong>Wind Speed:</strong> {formatWindSpeed(windSpeed)}</p>
              </div>
            )}
            {typeof sunrise === 'number' && typeof sunset === 'number' && (
              <div className="weather-details">
                <p><strong>Sunrise:</strong> {new Date(sunrise * 1000).toLocaleTimeString()}</p>
                <p><strong>Sunset:</strong> {new Date(sunset * 1000).toLocaleTimeString()}</p>
              </div>
            )}
          </section>
        </div>
      );
  } else if (isForecastSlotData(data)) {
    const { temperature, weather_icon, weather_description, feels_like, temp_min, temp_max, humidity: forecastHumidity, wind_speed } = data;
    const locationNameToDisplay = displayedLocationName || '';

    if (typeof temperature === 'number') {
      cardContent = (
        <div className="weather-card weather-card-mobile weather-card-mobile-active">
          <header className="weather-header">
            <h2>{title}{locationNameToDisplay ? ` in ${locationNameToDisplay}` : ''}</h2>
          </header>
          <div className="weather-icon-temp">
            <div className="weather-temp">{formatTemperature(temperature)}</div>
            <div className="weather-icon">
              <img
                src={`http://openweathermap.org/img/wn/${weather_icon}@2x.png`}
                alt={weather_description}
              />
            </div>
          </div>
          <div className="weather-description">{weather_description}</div>
          <section className="weather-info weather-info-active">
            {(typeof feels_like === 'number' || typeof temp_min === 'number' || typeof forecastHumidity === 'number') && (
              <div className="weather-details">
                {typeof feels_like === 'number' && <p><strong>Feels Like:</strong> {formatTemperature(feels_like)}</p>}
                {typeof temp_min === 'number' && typeof temp_max === 'number' && <p><strong>Min-Max:</strong> {formatTemperature(temp_min)} - {formatTemperature(temp_max)}</p>}
                {typeof forecastHumidity === 'number' && <p><strong>Humidity:</strong> {forecastHumidity}%</p>}
              </div>
            )}
            {typeof wind_speed === 'number' && (
              <div className="weather-details">
                <p><strong>Wind Speed:</strong> {formatWindSpeed(wind_speed)}</p>
              </div>
            )}
            {/* Forecast slots do not have sunrise/sunset info in this structure */}
          </section>
        </div>
      );
    }
  }

  return <div className="weather-display">{cardContent}</div>;
};

export default WeatherDisplay;
