import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, Mock } from 'vitest';
import UserProfile from '../UserProfileDisplay';
import { UserProfileData, Favorite } from '../../types/types';

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
  const mockUserProfile: UserProfileData = {
    id: 1,
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    location: 'Test City',
    preferred_temperature_unit: 'C',
    gender: 'Man',
    favorites: [],
  };
  const mockFavorites: Favorite[] = [
    { id: 1, city_name: 'City1', country_code: 'CC', latitude: 10, longitude: 20 },
  ];

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  test('does not fetch data if no auth token', () => {
    render(<UserProfile profile={null} favorites={[]} onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    expect(fetchUserProfile).not.toHaveBeenCalled();
    expect(fetchFavoriteLocations).not.toHaveBeenCalled();
  });

  test('fetches and displays profile and favorites on mount', async () => {
    render(<UserProfile profile={mockUserProfile} favorites={mockFavorites} onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    expect(await screen.findByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test City')).toBeInTheDocument();
    expect(screen.getByText('City1, CC')).toBeInTheDocument();
  });

  test('toggles temperature unit and calls updateUserProfile', async () => {
    (updateUserProfile as Mock).mockResolvedValue({ ...mockUserProfile, preferred_temperature_unit: 'F' });

    render(<UserProfile profile={mockUserProfile} favorites={[]} onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByDisplayValue('testuser'));

    const toggleButton = screen.getByRole('button', { name: /Switch to °F/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith(expect.objectContaining({ preferred_temperature_unit: 'F' }));
      expect(screen.getByText(/Currently: °F/i)).toBeInTheDocument();
    });
  });

  test('save changes calls updateUserProfile and shows success message', async () => {
    (updateUserProfile as Mock).mockResolvedValue(mockUserProfile);

    render(<UserProfile profile={mockUserProfile} favorites={[]} onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByDisplayValue('testuser'));

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalled();
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  test.each([
    ['username', { error: 'That username is already in use.' }, 'That username is already in use.'],
    ['email', { error: 'That email is already in use.' }, 'That email is already in use.'],
    ['location', { error: 'Invalid location error.' }, 'Invalid location error.'],
    ['first_name', { error: 'first_name missing.' }, 'first_name missing.'],
    ['last_name', { error: 'last_name missing.' }, 'last_name missing.'],
    ['other', { error: 'Unknown failure.' }, 'Unknown failure.'],
  ])(
    'parses and displays %s error on save failure',
    async (_field, apiError, expected) => {
      (updateUserProfile as Mock).mockRejectedValue({ isApiError: true, message: apiError.error });

      render(<UserProfile profile={mockUserProfile} favorites={[]} onFavoriteClick={() => {}} onFavoriteUpdated={() => {}} />);
      await waitFor(() => screen.getByDisplayValue('testuser'));

      fireEvent.click(screen.getByText('Save Changes'));
      await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument());
    }
  );

  test('clicking favorite calls onFavoriteClick', async () => {
    const onFavClick = vi.fn();

    render(<UserProfile profile={mockUserProfile} favorites={mockFavorites} onFavoriteClick={onFavClick} onFavoriteUpdated={() => {}} />);
    await waitFor(() => screen.getByText('City1, CC'));

    fireEvent.click(screen.getByText('City1, CC'));
    expect(onFavClick).toHaveBeenCalledWith('City1');
  });
});
