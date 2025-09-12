import { apiRequest } from './apiHelpers';
import { getAccessToken } from './user';

const BASE_URL = import.meta.env.VITE_BASE_PERSONALIZATION_URL;

export interface OutfitFeedbackPayload {
  weather_data: Record<string, any> & { unit?: 'C' | 'F' }; // unit for temperature in weather_data
  suggested_outfit: Record<string, any>; // Or a more specific type if available
  user_gender_at_feedback?: string; // Optional, as per backend model
  feedback_type: 'like' | 'dislike';
}

export const submitOutfitFeedback = async (payload: OutfitFeedbackPayload) => {
  const token = getAccessToken();
  if (!token) {
    // Although apiRequest will handle unauthorized errors, checking early prevents unnecessary API calls.
    throw new Error('User is not authenticated. Please log in to submit feedback.');
  }

  if (!BASE_URL) {
    throw new Error('Personalization API base URL is not configured.');
  }

  const url = `${BASE_URL}/feedback/outfit/`;

  // The Authorization header is now automatically added by the apiRequest helper.
  return apiRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: payload,
  });
};

// Helper function to convert camelCase to snake_case
const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const transformKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnakeCase);
  }
  return Object.keys(obj).reduce((acc, key) => {
    acc[camelToSnakeCase(key)] = transformKeysToSnakeCase(obj[key]);
    return acc;
  }, {} as Record<string, any>);
};

// Interface for the weather data expected by the new API (subset of frontend's WeatherData)
// Matches OutfitSuggestionRequestSerializer in the backend (excluding user_gender)
export interface OutfitSuggestionApiRequestData {
  feels_like: number;
  temperature: number;
  precipitation_chance?: number | null;
  weather_main?: string | null;
  weather_description?: string | null;
  uv_index?: number | null;
  wind_speed?: number | null;
  is_day?: boolean | null;
  datetime?: string | null; // ISO 8601 datetime string
}

// Interface for individual weather alerts
export interface WeatherAlert {
  event: string; // e.g., "Small Craft Advisory"
  description: string; // Detailed description of the alert
  sender_name?: string; // Name of the agency issuing the alert
  start?: number; // Unix timestamp, UTC for alert start time
  end?: number; // Unix timestamp, UTC for alert end time
  // Depending on the API, there might be other relevant fields like severity, certainty, urgency, areas affected, etc.
}

// Interface for the frontend weather data (camelCase)
// This should ideally match the WeatherData type from outfitSuggester.ts or a shared type definition
export interface FrontendWeatherData {
  feelsLike: number;
  temperature: number;
  unit?: 'C' | 'F'; // Unit of the temperature values
  precipitationChance?: number | null;
  weatherMain?: string | null;
  weatherDescription?: string | null;
  uvIndex?: number | null;
  windSpeed?: number | null;
  isDay?: boolean | null;
  datetime?: string | null;
  alerts?: WeatherAlert[] | null; // Added to include weather alerts
}

export interface OutfitSuggestionApiResponse {
  suggested_items: string[];
  advice_strings: string[];
}

export const getOutfitSuggestions = async (
  weatherData: FrontendWeatherData,
  userGender?: string,
  occasion?: string,
): Promise<OutfitSuggestionApiResponse> => {
  if (!BASE_URL) {
    throw new Error('Personalization API base URL is not configured.');
  }

  // Separate unit before transforming keys, as it's top-level and might not need case conversion
  const { unit, ...restOfWeatherData } = weatherData;
  const snakeCaseRestOfWeatherData = transformKeysToSnakeCase(restOfWeatherData) as OutfitSuggestionApiRequestData;

  // Sanitize precipitation_chance to ensure it's a number or null.
  const pcValue = snakeCaseRestOfWeatherData.precipitation_chance;
  if (pcValue === null || pcValue === undefined || isNaN(Number(pcValue))) {
    (snakeCaseRestOfWeatherData as any).precipitation_chance = null;
  } else {
    (snakeCaseRestOfWeatherData as any).precipitation_chance = Math.round(Number(pcValue));
  }
  
  const payload: any = { ...snakeCaseRestOfWeatherData };
  if (unit) {
    payload.unit = unit; // Add unit to the top level of the payload
  }
  if (userGender) {
    payload.user_gender = userGender;
  }
  if (occasion) {
    payload.occasion = occasion;
  }

  const url = `${BASE_URL}/suggest-outfit/`;

  return apiRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization header needed for this public endpoint
    },
    data: payload,
  });
};
