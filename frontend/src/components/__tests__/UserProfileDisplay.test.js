// UserProfileDisplay.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UserProfile from '../UserProfileDisplay';

// --- Mocks ---
// Mock the API functions in the user module.
jest.mock('../../api/user', () => ({
  fetchUserProfile: jest.fn(() =>
    Promise.resolve({
      location: 'Test City',
      preferred_temperature_unit: 'C',
      user: {
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      },
    })
  ),
  updateUserProfile: jest.fn(() =>
    Promise.resolve({
      location: 'Test City',
      preferred_temperature_unit: 'C',
      user: {
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      },
    })
  ),
}));

// Mock the API functions in the weather module.
jest.mock('../../api/weather', () => ({
  fetchFavoriteLocations: jest.fn(() =>
    Promise.resolve([
      {
        id: 1,
        city_name: 'London',
        country_code: 'GB',
        latitude: 51.5074,
        longitude: 0.1278,
      },
    ])
  ),
  removeFromFavorites: jest.fn(() => Promise.resolve({})),
}));

// For the delete animation, we simply stub the function.
jest.mock('../../utils/deleteAnimation.d', () => ({
  runDeleteAnimation: jest.fn(),
}));

// For the DeleteAccountModal lazy import, we override it with a dummy component.
jest.mock('../DeleteAccountModal', () => () => (
  <div data-testid="delete-account-modal">Delete Account Modal</div>
));

describe('UserProfileDisplay Component (Jest)', () => {
  const mockOnFavoriteClick = jest.fn();
  const mockOnFavoriteUpdated = jest.fn();

  beforeEach(() => {
    // Simulate authenticated user.
    localStorage.setItem('auth_token', 'dummy-token');
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders user profile fields after fetching data', async () => {
    render(
      <UserProfile
        onFavoriteClick={mockOnFavoriteClick}
        onFavoriteUpdated={mockOnFavoriteUpdated}
      />
    );
    // Wait for the asynchronous fetch in useEffect to update the form fields.
    expect(await screen.findByDisplayValue('testuser')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Test')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('User')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Test City')).toBeInTheDocument();
    // Also check that the static temperature unit text is rendered.
    expect(screen.getByText(/Celsius/i)).toBeInTheDocument();
  });

  test('toggles temperature unit and calls updateUserProfile when checkbox is clicked', async () => {
    render(
      <UserProfile
        onFavoriteClick={mockOnFavoriteClick}
        onFavoriteUpdated={mockOnFavoriteUpdated}
      />
    );
    // Wait for the profile data to load.
    await screen.findByDisplayValue('Test City');

    // Locate the switch checkbox.
    const unitSwitch = screen.getByRole('checkbox');
    // Initially, the unit is "C", so the checkbox should be unchecked.
    expect(unitSwitch.checked).toBe(false);

    // Click the switch to toggle the temperature unit.
    fireEvent.click(unitSwitch);

    // Wait for updateUserProfile to be called with the new unit.
    await waitFor(() => {
      expect(require('../../api/user').updateUserProfile).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        location: 'Test City',
        preferred_temperature_unit: 'F',
      });
    });
  });

  test('saves changes and alerts success when "Save Changes" is clicked', async () => {
    // Stub window.alert so that we can check for the message.
    window.alert = jest.fn();

    render(
      <UserProfile
        onFavoriteClick={mockOnFavoriteClick}
        onFavoriteUpdated={mockOnFavoriteUpdated}
      />
    );

    // Wait until the initial data is loaded.
    await screen.findByDisplayValue('testuser');

    // Change one of the fields (e.g. change email).
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(require('../../api/user').updateUserProfile).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'new@example.com',
        first_name: 'Test',
        last_name: 'User',
        location: 'Test City',
        preferred_temperature_unit: 'C',
      });
    });

    expect(window.alert).toHaveBeenCalledWith('Profile updated successfully!');
  });

  test('renders favorite locations and handles favorite deletion correctly', async () => {
    // Use fake timers to simulate the deletion timeout.
    jest.useFakeTimers();
    const { container } = render(
      <UserProfile
        onFavoriteClick={mockOnFavoriteClick}
        onFavoriteUpdated={mockOnFavoriteUpdated}
      />
    );

    // Wait until the favorites are rendered.
    await waitFor(() => {
      expect(screen.getByText(/Your Favorite Locations/i)).toBeInTheDocument();
      expect(screen.getByText(/London,\s*GB/i)).toBeInTheDocument();
    });

    // Get the deletion button by querying the container.
    const deleteButton = container.querySelector('.del-btn');
    expect(deleteButton).toBeInTheDocument();

    // Click on the delete button.
    fireEvent.click(deleteButton);

    // Advance timers by 1500ms so that the deletion promise is executed.
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(require('../../api/weather').removeFromFavorites).toHaveBeenCalledWith(
        'London',
        'GB',
        51.5074,
        0.1278
      );
      expect(mockOnFavoriteUpdated).toHaveBeenCalled();
    });

    // Restore real timers after the test.
    jest.useRealTimers();
  });

  test('renders DeleteAccountModal when "Delete Account" button is clicked', async () => {
    render(
      <UserProfile
        onFavoriteClick={mockOnFavoriteClick}
        onFavoriteUpdated={mockOnFavoriteUpdated}
      />
    );

    // Wait until profile data is loaded.
    await screen.findByDisplayValue('testuser');

    const deleteAccountButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteAccountButton);

    // The mocked DeleteAccountModal renders with a test id.
    expect(await screen.findByTestId('delete-account-modal')).toBeInTheDocument();
  });
});
