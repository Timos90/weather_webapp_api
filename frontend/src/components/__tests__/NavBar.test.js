// frontend/src/components/__tests__/NavBar.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NavBar from '../NavBar';
import { fetchUserProfile, updateUserProfile } from '../../api/user';

// Stub the API functions that are used inside the component.
jest.mock('../../api/user', () => ({
  fetchUserProfile: jest.fn().mockResolvedValue({
    preferred_temperature_unit: 'C',
    username: 'testuser',
    location: 'TestCity',
  }),
  updateUserProfile: jest.fn().mockResolvedValue({}),
}));

describe('NavBar Component (Jest)', () => {
  // Define mock callback props.
  const onSearch = jest.fn();
  const onProfileClick = jest.fn();
  const onAddFavorite = jest.fn();
  const onDeleteFavorite = jest.fn();
  const onUnitChange = jest.fn();

  beforeEach(() => {
    localStorage.clear(); // Reset authentication for each test
    jest.clearAllMocks();
  });

  it('renders Login and Register buttons when not authenticated', async () => {
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          currentLocation=""
          onProfileClick={onProfileClick}
          favorites={[]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          onUnitChange={onUnitChange}
        />
      );
    });

    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    // Ensure that profile and logout buttons are not rendered.
    expect(screen.queryByRole('button', { name: /Profile/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Logout/i })).toBeNull();
  });

  it('calls onSearch when the user submits search with Enter key', async () => {
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          currentLocation=""
          onProfileClick={onProfileClick}
          favorites={[]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          onUnitChange={onUnitChange}
        />
      );
    });

    const searchInput = screen.getByPlaceholderText(/Enter location/i);
    // Change the input value to "New York"
    fireEvent.change(searchInput, { target: { value: 'New York' } });
    // Simulate Enter key press.
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(onSearch).toHaveBeenCalledWith('New York');
    // The input value should be reset
    expect(searchInput.value).toBe('');
  });

  it('calls onSearch when clicking the search button', async () => {
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          currentLocation=""
          onProfileClick={onProfileClick}
          favorites={[]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          onUnitChange={onUnitChange}
        />
      );
    });

    const searchInput = screen.getByPlaceholderText(/Enter location/i);
    fireEvent.change(searchInput, { target: { value: 'Paris' } });

    const searchButton = screen.getByRole('button', { name: /Search/i });
    act(() => {
      fireEvent.click(searchButton);
    });

    expect(onSearch).toHaveBeenCalledWith('Paris');
    expect(searchInput.value).toBe('');
  });

  it('toggles the temperature unit and calls onUnitChange', async () => {
    // Simulate an authenticated user by setting a token in localStorage.
    localStorage.setItem('auth_token', 'dummy-token');

    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          currentLocation=""
          onProfileClick={onProfileClick}
          favorites={[]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          onUnitChange={onUnitChange}
        />
      );
    });

    // Assume that the switch is rendered as a checkbox.
    const toggleSwitch = screen.getByRole('checkbox');
    // Initially, unit is 'C' so checkbox is unchecked.
    expect(toggleSwitch.checked).toBe(false);

    act(() => {
      fireEvent.click(toggleSwitch);
    });

    await waitFor(() => {
      // onUnitChange should be called with 'F'
      expect(onUnitChange).toHaveBeenCalledWith('F');
    });
  });

  it('renders "Remove Favorite" button if currentLocation is already a favorite when authenticated', async () => {
    localStorage.setItem('auth_token', 'dummy-token');
    const favorites = [{ city_name: 'London', country_code: 'GB' }];
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          currentLocation="London, GB"
          onProfileClick={onProfileClick}
          favorites={favorites}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          onUnitChange={onUnitChange}
        />
      );
    });

    expect(screen.getByRole('button', { name: /Remove Favorite/i })).toBeInTheDocument();
  });

  it('renders "Add to Favorites" button if currentLocation is not already a favorite when authenticated', async () => {
    localStorage.setItem('auth_token', 'dummy-token');
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          currentLocation="Madrid, ES"
          onProfileClick={onProfileClick}
          favorites={[]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          onUnitChange={onUnitChange}
        />
      );
    });

    expect(screen.getByRole('button', { name: /Add to Favorites/i })).toBeInTheDocument();
  });
});
