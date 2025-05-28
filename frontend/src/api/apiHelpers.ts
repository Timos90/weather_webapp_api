import axios, { AxiosRequestConfig } from 'axios';

export const apiRequest = async (url: string, options?: AxiosRequestConfig) => {
  try {
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Throw a custom object that includes status and data from the Axios error response
      throw {
        message: error.message,
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