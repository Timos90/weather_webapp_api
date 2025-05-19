import React, { useState, useEffect, Suspense } from 'react';
import { updateUserProfile, fetchUserProfile } from '../api/user';
import axios from 'axios'; 
import '../css/NavBar.css';
import logo from '../img/logo_main2.svg';
import searchIcon from '../img/search-icon.svg';
import { NavBarProps } from '../types/types';

import LoginModal from './LoginModal';
const LazyRegisterModal = React.lazy(() => import('./RegisterModal'));

const NavBar: React.FC<NavBarProps> = ({
  onSearch,
  currentLocation,
  onProfileClick,
  favorites,
  onAddFavorite,
  onDeleteFavorite,
  onUnitChange,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    setIsAuthenticated(!!token);

    if (token) {
      fetchUserProfile()
        .then((profile) => {
          if (profile.preferred_temperature_unit === 'F') {
            setUnit('F');
          } else {
            setUnit('C');
          }
        })
        .catch((err) => console.error('Profile fetch error:', err));
    }
  }, []);

  const handleToggleUnit = async () => {
    const newUnit = unit === 'C' ? 'F' : 'C';
    setUnit(newUnit);
    onUnitChange(newUnit);

    if (isAuthenticated) {
      try {
        const profile = await fetchUserProfile();
        await updateUserProfile({ 
          username: profile.username, 
          location: profile.location, 
          preferred_temperature_unit: newUnit 
        });
      } catch (err) {
        console.error('Failed to update user profile with new unit:', err);
      }
    }
  };

  const handleSearch = () => {
    if (searchLocation.trim()) {
      onSearch(searchLocation);
      setSearchLocation('');
    } else {
      alert('Please enter a valid location.');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_USER_URL}/logout/`, {}, {
        headers: {
          Authorization: `Token ${sessionStorage.getItem('auth_token')}`,
        },
      });
      
      sessionStorage.removeItem('auth_token');
      alert(response.data.message);
      window.location.href = '/';
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        alert(error.response.data.error || 'Failed to log out.');
      } else {
        alert('Failed to log out.');
      }
    }
  };

  const isFavorite = currentLocation
    ? favorites.some((fav) => {
        const [city, country] = currentLocation.split(',').map((s) => s.trim());
        return fav.city_name === city && fav.country_code === country;
      })
    : false;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  return (
    <div className="navbar">
      <div className="logo" onClick={() => window.location.reload()}>
        <img src={logo} alt="WeatherApp Logo" className="logo-image" />
      </div>

      <div className="search-container">
        <input
          type="text"
          value={searchLocation}
          onChange={(e) => {
            let typed = e.target.value;
            if (typed.length > 0) {
              typed = typed[0].toUpperCase() + typed.slice(1);
            }
            setSearchLocation(typed);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          placeholder="Enter location"
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button">
          <img src={searchIcon} alt="Search" className="search-icon" />
        </button>
      </div>

      <div className="location-and-favorite">
        {currentLocation && (
          <>
            <h3 className="current-location">Location: {currentLocation}</h3>
            {isAuthenticated && (isFavorite ? (
              <button className="favorite-button" onClick={onDeleteFavorite}>
                Remove Favorite
              </button>
            ) : (
              <button className="favorite-button" onClick={onAddFavorite}>
                Add to Favorites
              </button>
            ))}
          </>
        )}
      </div>

      <div className="unit-switch-container">
        <div className="temp-switch">
          <span className={`unit-label-left ${unit === 'C' ? 'active' : ''}`}>
            °C
          </span>
          <label className="switch">
            <input
              type="checkbox"
              checked={unit === 'F'}
              onChange={handleToggleUnit}
            />
            <span className="slider round"></span>
          </label>
          <span className={`unit-label-right ${unit === 'F' ? 'active' : ''}`}>
            °F
          </span>
        </div>
      </div>

      <div className="auth-buttons">
        {!isAuthenticated ? (
          <>
            <button onClick={() => setShowLoginModal(true)} className="login-button">
              Login
            </button>
            <button onClick={() => setShowRegisterModal(true)} className="register-button">
              Register
            </button>
          </>
        ) : (
          <>
            <button onClick={onProfileClick} className="profile-button">
              Profile
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          window.location.reload();
        }}
      />

      <Suspense fallback={<div>Loading register...</div>}>
        <LazyRegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onRegisterSuccess={() => setShowRegisterModal(false)}
        />
      </Suspense>
    </div>
  );
};

export default NavBar;
