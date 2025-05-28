import { apiRequest } from './apiHelpers';
import { getAuthToken } from './user'; // Assuming getAuthToken is exported from user.ts

const BASE_URL = import.meta.env.VITE_BASE_PERSONALIZATION_URL;

export interface OutfitFeedbackPayload {
  weather_data: Record<string, any>; // Or a more specific type if available
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
