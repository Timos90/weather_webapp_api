import { ForecastItem } from '../types/types';
import { NewsArticle } from '../types/types';
import { apiRequest, buildUrl } from './apiHelpers';

const BASE_URL = import.meta.env.VITE_BASE_WEATHER_URL;

const getAuthToken = (): string | null => localStorage.getItem('auth_token');

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

//Helper function to fetch UV index
const fetchUVIndex = async (lat: number, lon: number): Promise<number> => {
  try {
    const api_key = import.meta.env.VITE_OPENWEATHERMAP_API_KEY; // For Vite
    // const api_key = process.env.REACT_APP_OPENWEATHERMAP_API_KEY; // For Create React App
    if (!api_key) {
      throw new Error('OpenWeatherMap API key is not configured.');
    }

    const url = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${api_key}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error fetching UV index data');
    }

    const data = await response.json();
    return data.value; // UV index value
  } catch (error) {
    console.error("Error fetching UV index:", error);
    if (error instanceof Error) {
      throw new Error(error.message || 'Error fetching UV index data');
    } else {
      throw new Error('Error fetching UV index data');
    }
  }
};

// Fetch forecast by location name or geolocation
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

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error fetching forecast data');
    }
    const data = await response.json();

    // Helper to format date as DD-MM-YYYY
    const formatDate = (dateObj: Date): string => {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Get today's formatted date
    const today = new Date();
    const todayFormatted = formatDate(today);

    // Also, compute tomorrow's date formatted for comparison
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowFormatted = formatDate(tomorrow);

    // Fetch UV index for the location
    const uvIndex = await fetchUVIndex(data.city.coord.lat, data.city.coord.lon);

    // Extract sunrise and sunset times
    const sunrise = data.city.sunrise ? new Date(data.city.sunrise * 1000).toLocaleTimeString() : undefined;
    const sunset = data.city.sunset ? new Date(data.city.sunset * 1000).toLocaleTimeString() : undefined;

    // Group forecasts by day using the formatted date as key
    const groupedForecasts = data.list.reduce((acc: { [key: string]: any }, entry: any) => {
      const entryDate = new Date(entry.dt * 1000);
      const entryDateFormatted = formatDate(entryDate); // Format as DD-MM-YYYY

      // Determine the day name
      let day_name = entryDateFormatted;
      if (entryDateFormatted === todayFormatted) {
        day_name = "Today";
      } else if (entryDateFormatted === tomorrowFormatted) {
        day_name = "Tomorrow";
      } else {
        // For other days, you can still show the weekday (if needed)
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

    // Convert the grouped object into an array
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


// Fetch news articles
export const fetchNews = async (location?: string): Promise<NewsArticle[]> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("User is not authenticated. Please log in.");

    const url = `${BASE_URL}/news/?location=${encodeURIComponent(location || '')}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        throw new Error(errorData.error || 'News API request limit reached. Please try again later.');
      }
      // Log a user-friendly message if no news found due to other errors
      console.info(`No news articles found for ${location || 'the specified location'}.`);
      return [];
    }

    const data = await response.json();
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
    console.error("News fetch error:", error);
    if (error instanceof Error && error.message.includes('News API request limit reached')) {
      throw error; // Propagate this specific error
    }
    return []; // Return empty array for other errors
  }
};


// Fetch user's favorite locations
export const fetchFavoriteLocations = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');

  const response = await fetch(`${BASE_URL}/favorites/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  const data = await response.json();
  if (response.status === 200) {
    return data;
  } else {
    throw new Error(data.error || 'Unable to fetch favorite locations.');
  }
};

// Add location to favorites
export const addToFavorites = async (city_name: string, country_code: string, latitude: number, longitude: number) => {
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');

  const response = await fetch(`${BASE_URL}/favorites/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      city_name,
      country_code,
      latitude,
      longitude,
    }),
  });

  const data = await response.json();
  if (response.status === 201) {
    return data;
  } else {
    throw new Error(data.error || 'Failed to add location to favorites.');
  }
};

// Remove location from favorites
export const removeFromFavorites = async (city_name: string, country_code: string, latitude: number, longitude: number) => {
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');

  const response = await fetch(`${BASE_URL}/favorites/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      city_name,
      country_code,
      latitude,
      longitude,
    }),
  });

  const data = await response.json();
  if (response.status === 200) {
    return data;
  } else {
    throw new Error(data.error || 'Failed to remove location from favorites.');
  }
};

export const fetchAlerts = async (location?: string): Promise<any[]> => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error("User is not authenticated. Please log in.");
  }
  
  const url = location
    ? `${BASE_URL}/alerts/?location=${encodeURIComponent(location)}`
    : `${BASE_URL}/alerts/`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    // If the response status is 404 (i.e. no alerts found), return an empty array.
    if (response.status === 404) {
      return [];
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch alerts.');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching alerts:", error);
    // Instead of throwing the error, return an empty array.
    return [];
  }
};

