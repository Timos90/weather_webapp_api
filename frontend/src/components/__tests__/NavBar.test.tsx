import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavBar from '../../components/NavBar';
import { vi } from 'vitest';
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
 
   it('shows add/remove favorite buttons based on props and calls callbacks', () => {
     // simulate authenticated state
     sessionStorage.setItem('auth_token', 'token');
     // already a favorite
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
     const removeBtn = screen.getByRole('button', { name: /remove favorite/i });
     expect(removeBtn).toBeInTheDocument();
     fireEvent.click(removeBtn);
     expect(onDeleteFavorite).toHaveBeenCalled();
 
     // not a favorite
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
     const addBtn = screen.getByRole('button', { name: /add to favorites/i });
     expect(addBtn).toBeInTheDocument();
     fireEvent.click(addBtn);
     expect(onAddFavorite).toHaveBeenCalled();
   });
 
   it('handles logout success and failure', async () => {
     sessionStorage.setItem('auth_token', 'token');
     const good = { status: 200, json: async () => ({ message: 'bye' }) } as any;
     const bad = { status: 400, json: async () => ({ error: 'err' }) } as any;
     vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(good).mockResolvedValueOnce(bad));
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
 
     fireEvent.click(screen.getByRole('button', { name: /logout/i }));
     await waitFor(() => expect(alert).toHaveBeenCalledWith('err'));
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