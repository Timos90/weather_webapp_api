import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NavBar from '../../components/NavBar';
import { vi } from 'vitest';
import axios from 'axios';
import * as userApi from '../../api/user';

describe('NavBar Component', () => {
  const onSearch = vi.fn();
  const onProfileClick = vi.fn();
  const onUnitChange = vi.fn();
  const onAddFavorite = vi.fn();
  const onDeleteFavorite = vi.fn();
  const currentLocation = 'City1, CC';

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    const alertMock = vi.fn(); // Create the mock for alert
    vi.stubGlobal('alert', alertMock); // Stub the global alert

    const mockLocation = {
      ancestorOrigins: {} as DOMStringList,
      assign: vi.fn(),
      hash: '',
      host: 'localhost:3000',
      hostname: 'localhost',
      href: 'http://localhost:3000/mock-path',
      origin: 'http://localhost:3000',
      pathname: '/mock-path',
      port: '3000',
      protocol: 'http:',
      reload: vi.fn(),
      replace: vi.fn(),
      search: '',
    } as Location;
    vi.stubGlobal('location', mockLocation);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders login/register buttons when not authenticated', () => {
    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('capitalizes first char in search input and calls onSearch', () => {
    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );
    const input = screen.getByPlaceholderText(/enter location/i);
    fireEvent.change(input, { target: { value: 'london' } });
    expect(input).toHaveValue('London');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('London');
  });

  it('alerts if search input is empty', () => {
    vi.stubGlobal('alert', vi.fn());
    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(alert).toHaveBeenCalledWith('Please enter a valid location.');
  });

  it('toggles unit locally and calls onUnitChange and updates profile when authenticated', async () => {
    sessionStorage.setItem('auth_token', 'token');
    vi.spyOn(userApi, 'fetchUserProfile').mockResolvedValue({ username: 'u', location: 'l', preferred_temperature_unit: 'C' });
    vi.spyOn(userApi, 'updateUserProfile').mockResolvedValue({});

    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );

    await waitFor(() => expect(userApi.fetchUserProfile).toHaveBeenCalled());

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(onUnitChange).toHaveBeenCalledWith('F');
    await waitFor(() => expect(userApi.updateUserProfile).toHaveBeenCalled());
    // verify that Fahrenheit label gains active class
    expect(screen.getByText(/°F/)).toHaveClass('active');
  });

  it('shows add/remove favorite buttons based on props and calls callbacks', async () => {
    // simulate authenticated state
    sessionStorage.setItem('auth_token', 'token');
    vi.spyOn(userApi, 'fetchUserProfile').mockResolvedValue({ username: 'testuser', location: 'Test Location', preferred_temperature_unit: 'C' });

    // already a favorite
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          onProfileClick={onProfileClick}
          onUnitChange={onUnitChange}
          currentLocation={currentLocation}
          favorites={[{ city_name: 'City1', country_code: 'CC' }]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          unit="C"
        />
      );
    });
    const removeBtn = screen.getByRole('button', { name: /remove favorite/i });
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);
    expect(onDeleteFavorite).toHaveBeenCalled();

    // not a favorite
    await act(async () => {
      render(
        <NavBar
          onSearch={onSearch}
          onProfileClick={onProfileClick}
          onUnitChange={onUnitChange}
          currentLocation={currentLocation}
          favorites={[]}
          onAddFavorite={onAddFavorite}
          onDeleteFavorite={onDeleteFavorite}
          unit="C"
        />
      );
    });
    const addBtn = screen.getByRole('button', { name: /add to favorites/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    expect(onAddFavorite).toHaveBeenCalled();
  });

  it('handles logout success', async () => {
    sessionStorage.setItem('auth_token', 'token');

    // Mock axios for successful logout
    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { message: 'bye' }
    } as any);

    vi.stubGlobal('alert', vi.fn());

    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('bye'));
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(window.location.href).toContain('/');

    // Restore the original implementation
    vi.restoreAllMocks();
  });

  it('handles logout failure', async () => {
    // Set up for error test
    sessionStorage.setItem('auth_token', 'token');
    // Mock potential profile fetch that might occur during re-renders
    vi.spyOn(userApi, 'fetchUserProfile').mockResolvedValue({ username: 'testuser', location: 'Test Location', preferred_temperature_unit: 'C' });

    // Mock axios for failed logout
    vi.spyOn(axios, 'post').mockRejectedValueOnce({
      isAxiosError: true,
      response: { 
        data: { error: 'err' } 
      }
    } as any);

    vi.stubGlobal('alert', vi.fn());

    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('err'));

    // Restore the original implementation
    vi.restoreAllMocks();
  });

  it('opens and closes login & register modals', () => {
    render(
      <NavBar
        onSearch={onSearch}
        onProfileClick={onProfileClick}
        onUnitChange={onUnitChange}
        currentLocation=""
        favorites={[]}
        onAddFavorite={onAddFavorite}
        onDeleteFavorite={onDeleteFavorite}
        unit="C"
      />
    );
    // Login modal
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(screen.queryByRole('heading', { name: /login/i })).toBeNull();

    // Register modal
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(screen.queryByRole('heading', { name: /register/i })).toBeNull();
  });
});
