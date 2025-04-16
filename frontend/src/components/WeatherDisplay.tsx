import React from 'react';
import '../css/WeatherDisplay.css';

interface WeatherDisplayProps {
  title: string;
  data: any;
  unit: 'C' | 'F';
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ title, data, unit }) => {
  const weather = data?.weather ? data.weather[0] : null;
  const main    = data?.main;
  const wind    = data?.wind;
  const sys     = data?.sys;
  const name   = data?.name;

  const formatTemperature = (temp: number) => {
    const suffix = unit === 'C' ? '°C' : '°F';
    return `${temp.toFixed(1)}${suffix}`;
  };

  const formatWindSpeed = (speed: number) => {
    const label = unit === 'C' ? 'm/s' : 'mph';
    return `${speed.toFixed(1)} ${label}`;
  };

  return (
    <div className="weather-display">
      {weather ? (
        <div className="weather-card weather-card-mobile weather-card-mobile-active">
          <header className="weather-header">
            <h2>{title} in {name}</h2>
          </header>
          <div className="weather-icon-temp">
            {main && <div className="weather-temp">{formatTemperature(main.temp)}</div>}
            <div className="weather-icon">
              <img
                src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
              />
            </div>
          </div>
          <div className="weather-description">{weather.description}</div>
          <section className="weather-info weather-info-active">
            {main && (
              <div className="weather-details">
                <p><strong>Feels Like:</strong> {formatTemperature(main.feels_like)}</p>
                <p><strong>Min-Max:</strong> {formatTemperature(main.temp_min)} - {formatTemperature(main.temp_max)}</p>
                <p><strong>Humidity:</strong> {main.humidity}%</p>
              </div>
            )}
            {wind && (
              <div className="weather-details">
                <p><strong>Wind Speed:</strong> {formatWindSpeed(wind.speed)}</p>
              </div>
            )}
            {sys && (
              <div className="weather-details">
                <p><strong>Sunrise:</strong> {new Date(sys.sunrise * 1000).toLocaleTimeString()}</p>
                <p><strong>Sunset:</strong> {new Date(sys.sunset * 1000).toLocaleTimeString()}</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="no-data">No weather data available</div>
      )}
    </div>
  );
};

export default WeatherDisplay;
