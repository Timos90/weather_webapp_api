import axios, { AxiosRequestConfig } from 'axios';

export const apiRequest = async (url: string, options?: AxiosRequestConfig) => {
  try {
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Extract the specific error message from the backend response if available
      let specificMessage = error.message; // Default to Axios's generic message
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          specificMessage = error.response.data;
        } else if (error.response.data.error && typeof error.response.data.error === 'string') {
          specificMessage = error.response.data.error;
        } else if (error.response.data.detail && typeof error.response.data.detail === 'string') {
          specificMessage = error.response.data.detail;
        } else if (error.response.data.message && typeof error.response.data.message === 'string') {
          // Handle cases where the backend might use 'message' key directly in data
          specificMessage = error.response.data.message;
        }
      }

      throw {
        message: specificMessage,
        status: error.response?.status,
        data: error.response?.data,
        isApiError: true // Add a flag to identify this as a structured API error
      };
    } else {
      // For non-Axios errors or unexpected issues
      throw {
        message: (error instanceof Error) ? error.message : 'An unknown error occurred',
        status: undefined,
        data: { detail: 'Unknown network or client-side error' },
        isApiError: false
      };
    }
  }
};

export const buildUrl = (baseUrl: string, endpoint: string, params: Record<string, any>) => {
  const queryString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${baseUrl}${endpoint}?${queryString}`;
};