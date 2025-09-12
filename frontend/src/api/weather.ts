import { ForecastItem } from '../types/types';
import { NewsArticle } from '../types/types';
import { apiRequest, buildUrl } from './apiHelpers';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_WEATHER_URL;



export const fetchCoordinates = async (location: string): Promise<{ lat: number; lon: number }> => {
  const api_key = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
  if (!api_key) {
    throw new Error('OpenWeatherMap API key is not configured.');
  }
  const url = buildUrl('https://api.openweathermap.org/geo/1.0/direct', '', {
    q: location,
    limit: 1,
    appid: api_key,
  });
  const data = await apiRequest(url);
  if (data && data.length > 0) {
    const { lat, lon } = data[0];
    return { lat, lon };
  }
  throw new Error(`Could not determine coordinates for ${location}.`);
};

export const fetchCurrentWeather = async (
  location?: string,
  lat?: number,
  lon?: number,
  units: 'metric' | 'imperial' = 'metric'
) => {
  let url = `${BASE_URL}/current/`;
  if (location) {
    url += `?location=${encodeURIComponent(location)}&units=${units}`;
  } else if (lat !== undefined && lon !== undefined) {
    url += `?lat=${lat}&lon=${lon}&units=${units}`;
  } else {
    throw new Error('Please provide a location or geolocation coordinates.');
  }
  return apiRequest(url);
};

const fetchUVIndex = async (lat: number, lon: number): Promise<number> => {
  try {
    const api_key = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!api_key) {
      throw new Error('OpenWeatherMap API key is not configured.');
    }
    const url = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${api_key}`;
    const response = await axios.get(url);
    return response.data.value;
  } catch (error) {
    console.error("Error fetching UV index:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Error fetching UV index data');
    } else if (error instanceof Error) {
      throw new Error(error.message || 'Error fetching UV index data');
    } else {
      throw new Error('Error fetching UV index data');
    }
  }
};

export const fetchForecast = async (
  location?: string,
  lat?: number,
  lon?: number,
  units: 'metric' | 'imperial' = 'metric'
): Promise<ForecastItem[]> => {
  // Refactored to use apiRequest for consistent error handling
  let url = `${BASE_URL}/forecast/`;
  if (location) {
    url += `?location=${encodeURIComponent(location)}&units=${units}`;
  } else if (lat !== undefined && lon !== undefined) {
    url += `?lat=${lat}&lon=${lon}&units=${units}`;
  } else {
    // This case should ideally be caught before calling, but as a safeguard:
    return Promise.reject(new Error('Please provide a location or geolocation coordinates.'));
  }

  try {
    const data = await apiRequest(url); // Use apiRequest

    // The rest of the data processing logic remains the same
    const formatDate = (dateObj: Date): string => {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };
    const today = new Date();
    const todayFormatted = formatDate(today);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowFormatted = formatDate(tomorrow);
    // Assuming city.coord.lat and city.coord.lon are present in the 'data' from apiRequest
    const uvIndex = await fetchUVIndex(data.city.coord.lat, data.city.coord.lon);
    const sunrise = data.city.sunrise ? new Date(data.city.sunrise * 1000).toLocaleTimeString() : undefined;
    const sunset = data.city.sunset ? new Date(data.city.sunset * 1000).toLocaleTimeString() : undefined;

    const groupedForecasts = data.list.reduce((acc: { [key: string]: any }, entry: any) => {
      const entryDate = new Date(entry.dt * 1000);
      const entryDateFormatted = formatDate(entryDate);
      let day_name = entryDateFormatted;
      if (entryDateFormatted === todayFormatted) {
        day_name = "Today";
      } else if (entryDateFormatted === tomorrowFormatted) {
        day_name = "Tomorrow";
      } else {
        day_name = entryDate.toLocaleDateString('en-US', { weekday: 'long' });
      }
      if (!acc[entryDateFormatted]) {
        acc[entryDateFormatted] = {
          day_name: day_name,
          date: entryDateFormatted,
          uv_index: uvIndex,
          sunrise,
          sunset,
          forecasts: [],
        };
      }
      acc[entryDateFormatted].forecasts.push({
        datetime: entry.dt_txt,
        temperature: entry.main.temp,
        feels_like: entry.main.feels_like,
        temp_min: entry.main.temp_min,
        temp_max: entry.main.temp_max,
        weather_main: entry.weather[0].main,
        weather_description: entry.weather[0].description,
        weather_icon: entry.weather[0].icon,
        humidity: entry.main.humidity,
        wind_speed: entry.wind.speed,
        pop: entry.pop !== undefined ? entry.pop * 100 : undefined,
      });
      return acc;
    }, {});
    return Object.values(groupedForecasts);
  } catch (error) {
    // If apiRequest throws an error, or fetchUVIndex, or data processing fails
    console.error("Error processing forecast data after apiRequest:", error);
    // Re-throw the error to be caught by the caller (HomePage.tsx)
    // If it's the custom error from apiRequest, it will be propagated as is.
    // If it's an error from fetchUVIndex or processing, it will be that error.
    throw error; 
  }
};

export const fetchNews = async (location?: string): Promise<NewsArticle[]> => {
  const url = `${BASE_URL}/news/?location=${encodeURIComponent(location || '')}`;

  try {
    const data = await apiRequest(url);

    if (Array.isArray(data)) {
      return data.map((article: any) => ({
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        content: article.content,
        urlToImage: article.urlToImage || null,
      }));
    } else if (data && Array.isArray(data.articles)) {
      if (data.articles.length === 0 && data.message) {
        console.info(data.message);
      }
      return data.articles.map((article: any) => ({
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        content: article.content,
        urlToImage: article.urlToImage || null,
      }));
    }
    console.warn('Unexpected data format for news:', data);
    return [];

  } catch (error: any) {
    console.error(`Error fetching news: ${error.message}`);
    throw error;
  }
};

export const fetchFavoriteLocations = async () => {
  const url = `${BASE_URL}/favorites/`;
  // apiRequest will automatically add the Authorization header and handle errors.
  return apiRequest(url);
};

export const addToFavorites = async (city_name: string, country_code: string, latitude: number, longitude: number) => {
  const url = `${BASE_URL}/favorites/`;
  return apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { city_name, country_code, latitude, longitude },
  });
};

export const removeFromFavorites = async (city_name: string, country_code: string, latitude: number, longitude: number) => {
  const url = `${BASE_URL}/favorites/`;
  return apiRequest(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    data: { city_name, country_code, latitude, longitude },
  });
};

export const fetchAlerts = async (location?: string, latitude?: number, longitude?: number): Promise<any[]> => {
  let urlParams = new URLSearchParams();
  if (location) {
    urlParams.append('location', location);
  }
  if (latitude !== undefined && longitude !== undefined) {
    urlParams.append('lat', latitude.toString());
    urlParams.append('lon', longitude.toString());
  }

  const queryString = urlParams.toString();
  const url = `${BASE_URL}/alerts/${queryString ? '?' + queryString : ''}`;

  try {
    return await apiRequest(url);
  } catch (error: any) {
    console.error(`Error fetching alerts: ${error.message}`);
    // A 404 for alerts means there are no active alerts, which is not an error condition.
    if (error.status === 404) {
      return [];
    }
    // For other errors, re-throw to be handled by the calling component.
    throw error;
  }
};
