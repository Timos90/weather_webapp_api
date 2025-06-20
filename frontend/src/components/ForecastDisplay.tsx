import React, { useState } from 'react';
import '../css/ForecastDisplay.css';
import { ForecastItem } from '../types/types';

/**
 * Props for the ForecastDisplay component.
 */
interface ForecastDisplayProps {
  /** An array of forecast data, where each item represents a day's forecast including multiple time slots. */
  data: ForecastItem[];
  /** The temperature unit to display ('C' for Celsius, 'F' for Fahrenheit). */
  unit: 'C' | 'F';
}

/**
 * Renders a 5-day weather forecast with daily tabs and expandable hourly details.
 * Each day's forecast can be selected via tabs, and individual forecast slots for that day
 * can be expanded to show more detailed weather information.
 *
 * @param {ForecastDisplayProps} props - The props for the component.
 * @returns {React.ReactElement} The forecast display section or a 'no data' message.
 */
const ForecastDisplay: React.FC<ForecastDisplayProps> = ({ data, unit }) => {
  /** State to keep track of the currently selected day's index in the `data` array. Defaults to the first day. */
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  if (!data || data.length === 0) {
    return (
      <div className="forecast-display">
        <h2>No forecast data available</h2>
      </div>
    );
  }

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

  /**
   * Props for the ForecastItemRow sub-component.
   * @param {any} forecast - The specific forecast data for this time slot.
   * @param {number | string} uv_index - The UV index for the day this forecast slot belongs to.
   * @param {string} [sunrise] - Optional sunrise time for the day.
   * @param {string} [sunset] - Optional sunset time for the day.
   */
  // Note: The props for ForecastItemRow are defined inline in its signature.
  // JSDoc for props is provided above for clarity.
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
    /**
     * Renders a single row in the forecast display, representing a specific time slot.
     * This row can be expanded to show more detailed weather information.
     */
    /** State to manage whether the forecast item row is expanded to show details. */
    const [expanded, setExpanded] = useState(false);

    /** 
     * Toggles the expanded state of the forecast item row.
     * Stops event propagation to prevent unintended parent element clicks.
     * @param {React.MouseEvent} e - The mouse event.
     */
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
          <span className="row-expand-label">{expanded ? "▲" : "▼"}</span>
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
