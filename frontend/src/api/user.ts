// user.ts
import { apiRequest,buildUrl } from './apiHelpers';

const BASE_URL = import.meta.env.VITE_BASE_USER_URL;

export const getAuthToken = (): string | null => localStorage.getItem('auth_token');

export const loginUser = async (username: string, password: string) => {
  const url = buildUrl(BASE_URL, '/login/', {});
  const data = await apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('auth_token', data.token);
  return data;
};

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  location: string,
  preferredTemperatureUnit: string,
  firstName?: string,
  lastName?: string
) => {
  const url = buildUrl(BASE_URL, '/register/', {});
  const data = await apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      location,
      preferred_temperature_unit: preferredTemperatureUnit,
      first_name: firstName || '',
      last_name: lastName || '',
    }),
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
  const token = getAuthToken();
  if (!token) throw new Error('User is not authenticated. Please log in.');
  const url = buildUrl(BASE_URL, '/logout/', {});
  const data = await apiRequest(url, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
  });
  localStorage.removeItem('auth_token');
  return data;
};

export const updateUserProfile = async (profileData: {
  location: string;
  preferred_temperature_unit?: 'C' | 'F';
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
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
    body: JSON.stringify(profileData),
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
    body: JSON.stringify({ email }),
  });
  // After deletion, you might remove the token
  localStorage.removeItem('auth_token');
  return data;
};