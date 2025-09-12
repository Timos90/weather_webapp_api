import axios, { AxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken } from './user';

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

export const apiRequest = async (url: string, options: AxiosRequestConfig = {}) => {
  const token = getAccessToken();
  if (token) {
    if (!options.headers) {
      options.headers = {};
    }
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const originalRequest = error.config;
      if (error.response.status === 401 && originalRequest && !originalRequest.url?.includes('/token/refresh')) {
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
              }
              return axios(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          isRefreshing = false;
          // Handle logout or redirect here
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          return Promise.reject(error);
        }

        return new Promise((resolve, reject) => {
          const API_ROOT_URL = import.meta.env.VITE_BASE_USER_URL.replace('/user', '');
          axios
            .post(`${API_ROOT_URL}/token/refresh/`, { refresh: refreshToken })
            .then(response => {
              const newAccessToken = response.data.access;
              sessionStorage.setItem('access_token', newAccessToken);
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              }
              processQueue(null, newAccessToken);
              resolve(axios(originalRequest));
            })
            .catch(err => {
              processQueue(err, null);
              sessionStorage.removeItem('access_token');
              sessionStorage.removeItem('refresh_token');
              // Handle logout or redirect here
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }

      let specificMessage = error.message;
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          specificMessage = error.response.data;
        } else if (error.response.data.error) {
          specificMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          specificMessage = error.response.data.detail;
        }
      }

      throw {
        message: specificMessage,
        status: error.response.status,
        data: error.response.data,
        isApiError: true,
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