import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, Mock } from 'vitest';
import UserProfile from '../UserProfileDisplay';

// Mock API modules and utilities
vi.mock('../../api/user', () => ({
  fetchUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));
vi.mock('../../api/weather', () => ({
  fetchFavoriteLocations: vi.fn(),
  removeFromFavorites: vi.fn(),
}));
vi.mock('../../utils/deleteAnimation.d', () => ({ runDeleteAnimation: vi.fn() }));

import { fetchUserProfile, updateUserProfile } from '../../api/user';
import { fetchFavoriteLocations } from '../../api/weather';

describe('UserProfileDisplay Component', () => {
  const mockProfile = {
    user: { username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
    location: 'TestVille',
    preferred_temperature_unit: 'C',
  };
  const mockFavorites = [
    { id: 1, city_name: 'City1', country_code: 'CC', latitude: 10, longitude: 20 },
  ];

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  test('does not fetch data if no auth token', () => {
    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    expect(fetchUserProfile).not.toHaveBeenCalled();
    expect(fetchFavoriteLocations).not.toHaveBeenCalled();
  });

  test('fetches and displays profile and favorites on mount', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue(mockFavorites);

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);

    await waitFor(() => screen.getByDisplayValue('testuser'));
    expect(screen.getByDisplayValue('TestVille')).toBeInTheDocument();
    expect(screen.getByText('City1, CC')).toBeInTheDocument();
  });

  test('displays general error if profile fetch fails', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockRejectedValue(new Error('fail'));
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByText('Unable to fetch user profile.'));
  });

  test('displays general error if favorites fetch fails', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockRejectedValue(new Error('fail'));

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByText('Unable to fetch favorite locations.'));
  });

  test('toggles temperature unit and calls updateUserProfile', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);
    (updateUserProfile as Mock).mockResolvedValue({ ...mockProfile, preferred_temperature_unit: 'F' });

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByDisplayValue('testuser'));

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith(expect.objectContaining({ preferred_temperature_unit: 'F' }));
      expect(screen.getByText('Fahrenheit')).toBeInTheDocument();
    });
  });

  test('save changes calls updateUserProfile and alerts on success', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);
    (updateUserProfile as Mock).mockResolvedValue({ ...mockProfile });
    global.alert = vi.fn();

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByDisplayValue('testuser'));

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Profile updated successfully!');
    });
  });

  test.each([
    ['username', 'That username is already in use.', 'That username is already in use.'],
    ['email', 'That email is already in use.', 'That email is already in use.'],
    ['location', 'Invalid location error.', 'Invalid location error.'],
    ['first_name', 'first_name missing.', 'first_name missing.'],
    ['last_name', 'last_name missing.', 'last_name missing.'],
    ['other', 'Unknown failure.', 'Unknown failure.'],
  ])(
    'parses and displays %s error on save failure',
    async (_field, message, expected) => {
      sessionStorage.setItem('auth_token', 'token');
      (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
      (fetchFavoriteLocations as Mock).mockResolvedValue([]);
      (updateUserProfile as Mock).mockRejectedValue(new Error(message));

      render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
      await waitFor(() => screen.getByDisplayValue('testuser'));

      fireEvent.click(screen.getByText('Save Changes'));
      await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument());
    }
  );

  test('clicking favorite calls onFavoriteClick', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue(mockFavorites);
    const onFavClick = vi.fn();

    render(<UserProfile onFavoriteClick={onFavClick} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByText('City1, CC'));

    fireEvent.click(screen.getByText('City1, CC'));
    expect(onFavClick).toHaveBeenCalledWith('City1');
  });

  // --- Additional UI interaction tests ---
  test('allows editing of username field', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    const input = await screen.findByDisplayValue('testuser');
    fireEvent.change(input, { target: { value: 'newuser' } });
    expect((input as HTMLInputElement).value).toBe('newuser');
  });

  test('allows editing of location field', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    const locInput = await screen.findByDisplayValue('TestVille');
    fireEvent.change(locInput, { target: { value: 'NewVille' } });
    expect((locInput as HTMLInputElement).value).toBe('NewVille');
  });

  test('initial unit label reflects default unit', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    expect(await screen.findByText('Celsius')).toBeInTheDocument();
  });

  test('first name and last name fields are editable', async () => {
    sessionStorage.setItem('auth_token', 'token');
    (fetchUserProfile as Mock).mockResolvedValue(mockProfile);
    (fetchFavoriteLocations as Mock).mockResolvedValue([]);

    render(<UserProfile onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    const firstInput = await screen.findByDisplayValue('Test');
    const lastInput = await screen.findByDisplayValue('User');
    fireEvent.change(firstInput, { target: { value: 'Alpha' } });
    fireEvent.change(lastInput, { target: { value: 'Beta' } });
    expect((firstInput as HTMLInputElement).value).toBe('Alpha');
    expect((lastInput as HTMLInputElement).value).toBe('Beta');
  });
});

