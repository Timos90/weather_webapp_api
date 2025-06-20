import { apiRequest } from './apiHelpers';
import { getAuthToken } from './user'; // Assuming getAuthToken is exported from user.ts

const BASE_URL = import.meta.env.VITE_BASE_PERSONALIZATION_URL;

export interface OutfitFeedbackPayload {
  weather_data: Record<string, any> & { unit?: 'C' | 'F' }; // unit for temperature in weather_data
  suggested_outfit: Record<string, any>; // Or a more specific type if available
  user_gender_at_feedback?: string; // Optional, as per backend model
  feedback_type: 'like' | 'dislike';
}

export const submitOutfitFeedback = async (payload: OutfitFeedbackPayload) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('User is not authenticated. Please log in to submit feedback.');
  }

  if (!BASE_URL) {
    throw new Error('Personalization API base URL is not configured.');
  }

  const url = `${BASE_URL}/feedback/outfit/`;

  return apiRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
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
  userGender?: string
): Promise<OutfitSuggestionApiResponse> => {
  if (!BASE_URL) {
    throw new Error('Personalization API base URL is not configured.');
  }

  // Separate unit before transforming keys, as it's top-level and might not need case conversion
  const { unit, ...restOfWeatherData } = weatherData;
  const snakeCaseRestOfWeatherData = transformKeysToSnakeCase(restOfWeatherData) as OutfitSuggestionApiRequestData;

  // Sanitize precipitation_chance to ensure it's an integer or null
  if (snakeCaseRestOfWeatherData.hasOwnProperty('precipitation_chance')) {
    let pcValue: any = snakeCaseRestOfWeatherData.precipitation_chance; // Use 'any' for robust runtime type checking

    if (typeof pcValue === 'string') {
      if (pcValue.trim() === '') {
        pcValue = null; // Convert empty string to null
      } else {
        const parsed = parseFloat(pcValue);
        if (!isNaN(parsed)) {
          pcValue = Math.round(parsed); // Round to nearest integer
        } else {
          console.warn(`precipitation_chance was a non-numeric string: "${pcValue}". Setting to null.`);
          pcValue = null; // Non-numeric string, set to null
        }
      }
    } else if (typeof pcValue === 'number') {
      if (!Number.isInteger(pcValue)) {
        pcValue = Math.round(pcValue); // Round float to nearest integer
      }
    } else if (pcValue === undefined) {
      pcValue = null; // Explicitly convert undefined to null if property exists but is undefined
    } else if (pcValue !== null) {
      // Handles other unexpected types e.g. boolean, object (if data is really malformed)
      console.warn(`Unexpected type for precipitation_chance: ${typeof pcValue}, value: "${pcValue}". Setting to null.`);
      pcValue = null;
    }
    // pcValue should now be number (integer) or null
    if (pcValue === null) {
      delete (snakeCaseRestOfWeatherData as any).precipitation_chance;
    } else {
      snakeCaseRestOfWeatherData.precipitation_chance = pcValue as number;
    }
  } else {
    // If precipitation_chance is not a property on snakeCaseRestOfWeatherData, 
    // it will be undefined. For an optional field with allow_null=False, 
    // it's best to omit it entirely, which is achieved by not setting it here.
    delete (snakeCaseRestOfWeatherData as any).precipitation_chance; // Ensure it's removed if not present or became undefined
  }
  
  const payload: any = { ...snakeCaseRestOfWeatherData };
  if (unit) {
    payload.unit = unit; // Add unit to the top level of the payload
  }
  if (userGender) {
    payload.user_gender = userGender;
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
