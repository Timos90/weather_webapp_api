import React, { useState } from 'react';
import '../css/ForecastDisplay.css';
import { ForecastItem } from '../types/types';

interface ForecastDisplayProps {
  data: ForecastItem[];
  unit: 'C' | 'F';
}

const ForecastDisplay: React.FC<ForecastDisplayProps> = ({ data, unit }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  if (!data || data.length === 0) {
    return (
      <div className="forecast-display">
        <h2>No forecast data available</h2>
      </div>
    );
  }

  // Utility functions for formatting
  const formatTemperature = (temp: number) => {
    const suffix = unit === 'C' ? '°C' : '°F';
    return `${temp.toFixed(1)}${suffix}`;
  };

  const formatWindSpeed = (speed: number) => {
    const label = unit === 'C' ? 'm/s' : 'mph';
    return `${speed.toFixed(1)} ${label}`;
  };

  // Compact forecast item row with expandable overlay details
  const ForecastItemRow = ({
    forecast,
    uv_index,
    sunrise,
    sunset,
  }: {
    forecast: any;
    uv_index: number | string;
    sunrise?: string;
    sunset?: string;
  }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded(!expanded);
    };

    return (
      <div
        className={`forecast-item ${expanded ? 'expanded' : ''}`}
        onClick={toggleExpand}
      >
        <div className="row-summary">
        <span className="row-time">{forecast.datetime.split(' ')[1].slice(0, 5)}</span>
          <span className="row-temp">{formatTemperature(forecast.temperature)}</span>
          <span className="row-icon">
            <img
              src={`http://openweathermap.org/img/wn/${forecast.weather_icon}@2x.png`}
              alt={forecast.weather_description}
            />
          </span>
          <span className="row-desc">{forecast.weather_description}</span>
          <span className="row-expand-label">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
        {expanded && (
          <div className="forecast-overlay" onClick={toggleExpand}>
            <div className="overlay-details">
              <p><strong>Feels Like:</strong> {formatTemperature(forecast.feels_like)}</p>
              <p><strong>Min:</strong> {formatTemperature(forecast.temp_min)}</p>
              <p><strong>Max:</strong> {formatTemperature(forecast.temp_max)}</p>
              <p><strong>Humidity:</strong> {forecast.humidity}%</p>
              <p><strong>Wind Speed:</strong> {formatWindSpeed(forecast.wind_speed)}</p>
              <p><strong>UV Index:</strong> {uv_index}</p>
              {sunrise && <p><strong>Sunrise:</strong> {sunrise}</p>}
              {sunset && <p><strong>Sunset:</strong> {sunset}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const selectedDay = data[selectedDayIndex];

  return (
    <div className="forecast-display">
      <div className='forecast-card'>
      <header className="forecast-header">
        <h2>5-Day Forecast</h2>
      </header>
      <div className="forecast-tabs">
        {data.map((day, index) => (
          <div
            key={index}
            className={`forecast-tab ${index === selectedDayIndex ? 'active' : ''}`}
            onClick={() => setSelectedDayIndex(index)}
          >
            {day.day_name}
            <br />
            <span className="forecast-tab-date">{day.date}</span>
          </div>
        ))}
      </div>
      <div className="forecast-items">
        {selectedDay.forecasts.map((forecast, idx) => (
          <ForecastItemRow
            key={idx}
            forecast={forecast}
            uv_index={selectedDay.uv_index}
            sunrise={selectedDay.sunrise}
            sunset={selectedDay.sunset}
          />
        ))}
      </div>
      </div>
    </div>
  );
};

export default ForecastDisplay;
