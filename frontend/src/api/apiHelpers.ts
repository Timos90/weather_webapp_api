import axios, { AxiosRequestConfig } from 'axios';

export const apiRequest = async (url: string, options?: AxiosRequestConfig) => {
  try {
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    } else {
      throw { error: 'Unknown error' };
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
  