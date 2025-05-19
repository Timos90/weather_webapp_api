import { ForecastItem } from '../types/types';
import { NewsArticle } from '../types/types';
import { apiRequest, buildUrl } from './apiHelpers';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_WEATHER_URL;

const getAuthToken = (): string | null => sessionStorage.getItem('auth_token');

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
  try {
    let url = `${BASE_URL}/forecast/`;
    if (location) {
      url += `?location=${encodeURIComponent(location)}&units=${units}`;
    } else if (lat !== undefined && lon !== undefined) {
      url += `?lat=${lat}&lon=${lon}&units=${units}`;
    } else {
      throw new Error('Please provide a location or geolocation coordinates.');
    }
    const response = await axios.get(url);
    const data = response.data;
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
        weather_description: entry.weather[0].description,
        weather_icon: entry.weather[0].icon,
        humidity: entry.main.humidity,
        wind_speed: entry.wind.speed,
      });
      return acc;
    }, {});
    return Object.values(groupedForecasts);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    if (error instanceof Error) {
      throw new Error(error.message || 'Error fetching forecast data');
    } else {
      throw new Error('Error fetching forecast data');
    }
  }
};

export const fetchNews = async (location?: string): Promise<NewsArticle[]> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("User is not authenticated. Please log in.");
    const url = `${BASE_URL}/news/?location=${encodeURIComponent(location || '')}`;
    
    try {
      const response = await axios.get(url, {
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      });
      
      const data = response.data;
      const articles = data.map((article: any) => ({
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        content: article.content,
        urlToImage: article.urlToImage || null,
      }));
      
      if (articles.length === 0) {
        console.info(`No news articles found for ${location || 'the specified location'}.`);
      }
      
      return articles;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error(error.response.data.error || 'News API request limit reached. Please try again later.');
        }
        console.info(`No news articles found for ${location || 'the specified location'}.`);
      }
      return [];
    }
  } catch (error) {
    console.error("News fetch error:", error);
    if (error instanceof Error && error.message.includes('News API request limit reached')) {
      throw error;
    }
    return [];
  }
};

export const fetchFavoriteLocations = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');
  try {
    const response = await axios.get(`${BASE_URL}/favorites/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Unable to fetch favorite locations.');
    }
    throw error;
  }
};

export const addToFavorites = async (city_name: string, country_code: string, latitude: number, longitude: number) => {
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');
  try {
    const response = await axios.post(`${BASE_URL}/favorites/`, {
      city_name,
      country_code,
      latitude,
      longitude,
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Failed to add location to favorites.');
    }
    throw error;
  }
};

export const removeFromFavorites = async (city_name: string, country_code: string, latitude: number, longitude: number) => {
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');
  try {
    const response = await axios.delete(`${BASE_URL}/favorites/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
      data: {
        city_name,
        country_code,
        latitude,
        longitude,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Failed to remove location from favorites.');
    }
    throw error;
  }
};

export const fetchAlerts = async (location?: string): Promise<any[]> => {
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    throw new Error("User is not authenticated. Please log in.");
  }
  const url = location
    ? `${BASE_URL}/alerts/?location=${encodeURIComponent(location)}`
    : `${BASE_URL}/alerts/`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching alerts:", error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return [];
      }
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'Failed to fetch alerts.');
      }
    }
    return [];
  }
};
