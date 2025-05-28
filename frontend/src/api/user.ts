import { apiRequest, buildUrl } from './apiHelpers';
import { GenderOption } from '../types/types';

const BASE_URL = import.meta.env.VITE_BASE_USER_URL;

export const getAuthToken = (): string | null => sessionStorage.getItem('auth_token');

export const loginUser = async (username: string, password: string) => {
  const url = buildUrl(BASE_URL, '/login/', {});
  const data = await apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { username, password },
  });
  sessionStorage.setItem('auth_token', data.token);
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
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');
  const url = buildUrl(BASE_URL, '/profile/', {});
  return apiRequest(url, {
    headers: { Authorization: `Token ${token}` },
  });
};

export const logoutUser = async () => {
  const token = sessionStorage.getItem('auth_token');
  if (!token) throw new Error('Not logged in');
  await apiRequest(buildUrl(BASE_URL, '/logout/', {}), {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    data: {},
  });
  sessionStorage.removeItem('auth_token');
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
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');
  const url = buildUrl(BASE_URL, '/profile/', {});
  return apiRequest(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    data: profileData,
  });
};

export const deleteUserAccount = async (email: string) => {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('User is not authenticated. Please log in.');
  const url = buildUrl(BASE_URL, '/delete_account/', {});
  const data = await apiRequest(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    data: { email },
  });
  sessionStorage.removeItem('auth_token');
  return data;
};
