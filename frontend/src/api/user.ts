import { apiRequest, buildUrl } from './apiHelpers';
import { GenderOption } from '../types/types';

const BASE_URL = import.meta.env.VITE_BASE_USER_URL;

export const getAccessToken = (): string | null => sessionStorage.getItem('access_token');
export const getRefreshToken = (): string | null => sessionStorage.getItem('refresh_token');

export const loginUser = async (username: string, password: string) => {
  const API_ROOT_URL = import.meta.env.VITE_BASE_USER_URL.replace('/user', '');
  const url = `${API_ROOT_URL}/token/`;
  const data = await apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { username, password },
  });
  sessionStorage.setItem('access_token', data.access);
  sessionStorage.setItem('refresh_token', data.refresh);
  return data;
};

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  location: string,
  preferredTemperatureUnit: string,
  gender: GenderOption,
  firstName?: string,
  lastName?: string
) => {
  const url = buildUrl(BASE_URL, '/register/', {});
  const data = await apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      username,
      email,
      password,
      location,
      preferred_temperature_unit: preferredTemperatureUnit,
      gender,
      first_name: firstName || '',
      last_name: lastName || '',
    },
  });
  return data;
};

export const fetchUserProfile = async () => {
  const url = buildUrl(BASE_URL, '/profile/', {});
  return apiRequest(url, {});
};

export const logoutUser = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('Not logged in');
  await apiRequest(buildUrl(BASE_URL, '/logout/', {}), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { refresh: refreshToken },
  });
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
};

export const updateUserProfile = async (profileData: {
  location: string;
  preferred_temperature_unit?: 'C' | 'F';
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  gender?: GenderOption;
}) => {
  const url = buildUrl(BASE_URL, '/profile/', {});
  return apiRequest(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: profileData,
  });
};

export const deleteUserAccount = async (email: string) => {
  const url = buildUrl(BASE_URL, '/delete_account/', {});
  const data = await apiRequest(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { email },
  });
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  return data;
};
