import React, { useState, useEffect, MouseEvent } from 'react';
import { updateUserProfile } from '../api/user';
import { removeFromFavorites } from '../api/weather';
import '../css/UserProfilePage.css';
import '../css/deleteAnimation.css'; 
import { runDeleteAnimation } from '../utils/deleteAnimation'; 
import DeleteAccountModal from './DeleteAccountModal';
import { Favorite, UserProfileProps, GenderOption, UserProfileData } from '../types/types';

interface UserProfileDisplayProps extends UserProfileProps {
  onProfileDataChange?: (newGender: GenderOption) => void;
  onTemperatureUnitChange?: (newUnit: 'C' | 'F') => void;
  profile: UserProfileData | null;
  favorites: Favorite[];
}

const UserProfileDisplay: React.FC<UserProfileDisplayProps> = ({ onFavoriteClick, onFavoriteUpdated, onProfileDataChange, onTemperatureUnitChange, profile, favorites: initialFavorites }) => {
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [preferredTemperatureUnit, setPreferredTemperatureUnit] = useState<'C' | 'F'>(profile?.preferred_temperature_unit || 'C');
  const [gender, setGender] = useState<GenderOption | undefined>(profile?.gender);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [favorites, setFavorites] = useState<Favorite[]>(initialFavorites);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setLocation(profile.location || '');
      setPreferredTemperatureUnit(profile.preferred_temperature_unit || 'C');
      setGender(profile.gender);
    }
  }, [profile]);

  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  const handleToggleUnit = async () => {
    const newUnit = preferredTemperatureUnit === 'C' ? 'F' : 'C';
    setGeneralError(null);
    setSuccessMessage(null);
    try {
      const updatedProfile = await updateUserProfile({
        preferred_temperature_unit: newUnit,
        location,
        email,
        first_name: firstName,
        last_name: lastName,
        username,
        gender,
      });
      setPreferredTemperatureUnit(updatedProfile.preferred_temperature_unit);
      setGender(updatedProfile.gender as GenderOption);
      setSuccessMessage('Temperature unit preference updated successfully!');
      if (onTemperatureUnitChange) {
        onTemperatureUnitChange(updatedProfile.preferred_temperature_unit);
      }
      if (updatedProfile.gender && onProfileDataChange) {
        onProfileDataChange(updatedProfile.gender as GenderOption);
      }
    } catch (err) {
      setPreferredTemperatureUnit(preferredTemperatureUnit === 'C' ? 'F' : 'C');
      if (err instanceof Error) {
        setGeneralError(`Failed to update unit preference: ${err.message}`);
      } else {
        setGeneralError('Failed to update unit preference. An unknown error occurred.');
      }
    }
  };

  const handleSave = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setUsernameError('');
    setEmailError('');
    setFirstNameError('');
    setLastNameError('');
    setLocationError('');
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const updatedProfileData = {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        location,
        preferred_temperature_unit: preferredTemperatureUnit,
        gender: gender,
      };
      const updatedProfile = await updateUserProfile(updatedProfileData);

      setUsername(updatedProfile.username);
      setEmail(updatedProfile.email);
      setFirstName(updatedProfile.first_name);
      setLastName(updatedProfile.last_name);
      setLocation(updatedProfile.location);
      setPreferredTemperatureUnit(updatedProfile.preferred_temperature_unit);
      setGender(updatedProfile.gender as GenderOption);
      setSuccessMessage('Profile updated successfully!');
      if (onProfileDataChange) {
        // Notify parent to refetch profile data
        onProfileDataChange(updatedProfile.gender as GenderOption);
      }
    } catch (err: any) { // Catch as 'any' to inspect its properties
      // Check for our custom API error structure
      if (err && err.isApiError && err.message) {
        parseAndAssignErrors(err.message);
      } else if (err instanceof Error) { // Fallback for other types of errors
        setGeneralError(`Failed to update profile: ${err.message}`);
      } else {
        setGeneralError('Failed to update profile. An unknown error occurred.');
      }
    }
  };

  const parseAndAssignErrors = (msg: string) => {
    if (msg.toLowerCase().includes('username')) setUsernameError(msg);
    else if (msg.toLowerCase().includes('email')) setEmailError(msg);
    else if (msg.toLowerCase().includes('location')) setLocationError(msg);
    else if (msg.toLowerCase().includes('first name') || msg.toLowerCase().includes('first_name')) setFirstNameError(msg);
    else if (msg.toLowerCase().includes('last name') || msg.toLowerCase().includes('last_name')) setLastNameError(msg);
    else setGeneralError(msg);
  };

  const handleDeleteFavorite = async (
    city_name: string,
    country_code: string,
    latitude: number,
    longitude: number,
    e: MouseEvent<HTMLButtonElement>
  ) => {
    const btn = e.currentTarget;
    runDeleteAnimation(btn);
    setGeneralError(null);
    setSuccessMessage(null);

    setTimeout(async () => {
      try {
        await removeFromFavorites(city_name, country_code, latitude, longitude);
        setFavorites((prev) =>
          prev.filter(
            (f) =>
              !(f.city_name === city_name && f.country_code === country_code && f.latitude === latitude && f.longitude === longitude)
          )
        );
        onFavoriteUpdated?.();
      } catch (error) {
        if (error instanceof Error) {
          setGeneralError(`Failed to remove ${city_name}: ${error.message}`);
        } else {
          setGeneralError(`Failed to remove ${city_name}. An unknown error occurred.`);
        }
        btn.classList.remove('deleting');
      }
    }, 1100);
  };
  
  if (!profile) {
    return <div>Loading profile...</div>;
  }

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGenderValue = e.target.value as GenderOption | '';
    const newGender = newGenderValue === '' ? undefined : newGenderValue;
    setGender(newGender);
    if (newGender && onProfileDataChange) {
       // Call onProfileDataChange immediately if gender is part of outfit advice logic that needs instant update
       // However, current setup saves gender with the main form save.
    }
  };

  return (
    <div className="user-profile-page">
      {generalError && <div className="error-message">{generalError}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <form onSubmit={handleSave}>
        <div className="profile-section">
          <h2>Profile Details</h2>
          <label htmlFor="username">Username:</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          {usernameError && <p className="error-text">{usernameError}</p>}

          <label htmlFor="email">Email:</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {emailError && <p className="error-text">{emailError}</p>}

          <label htmlFor="firstName">First Name:</label>
          <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          {firstNameError && <p className="error-text">{firstNameError}</p>}

          <label htmlFor="lastName">Last Name:</label>
          <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          {lastNameError && <p className="error-text">{lastNameError}</p>}

          <label htmlFor="location">Location:</label>
          <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          {locationError && <p className="error-text">{locationError}</p>}
        </div>

        <div className="profile-section preferences-section"> {/* Added 'preferences-section' class */}
          <h2>Preferences</h2>
          
          <div className="preference-item"> {/* Wrapper for Temperature Unit */}
            <label htmlFor="temperatureUnit">Preferred Temperature Unit:</label>
            <div className="preference-control-container">
              <p className="current-preference-display">Currently: &deg;{preferredTemperatureUnit}</p>
              <button 
                type="button" 
                onClick={handleToggleUnit} 
                className="styled-button-secondary toggle-unit-button" /* Added 'toggle-unit-button' class */
              >
                Switch to &deg;{preferredTemperatureUnit === 'C' ? 'F' : 'C'}
              </button>
            </div>
          </div>

          <div className="preference-item"> {/* Wrapper for Gender */}
            <label htmlFor="gender">Gender (for outfit advice):</label>
            <div className="preference-control-container">
              <select id="gender" value={gender || ''} onChange={handleGenderChange}>
                <option value="">Prefer not to say</option>
                <option value="Man">Man</option>
                <option value="Woman">Woman</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="profile-section">
          <button type="submit" className="styled-button-primary">Save Changes</button>
        </div>
      </form>

      <div className="profile-section favorites">
        <h2>Your Favorite Locations</h2>
        {favorites.length > 0 ? (
          <ul className="favorites-list">
            {favorites.map((fav) => (
              <li key={`${fav.city_name}-${fav.latitude}-${fav.longitude}`}>
                <span
                  onClick={() => onFavoriteClick && onFavoriteClick(fav.city_name)}
                  className="favorite-name"
                  role="button"
                  tabIndex={0}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onFavoriteClick && onFavoriteClick(fav.city_name);
                    }
                  }}
                >
                  {fav.city_name}, {fav.country_code.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteFavorite(fav.city_name, fav.country_code, fav.latitude, fav.longitude, e)}
                  className="delete-favorite-button del-btn styled-button-danger"
                  aria-label={`Remove ${fav.city_name} from favorites`}
                >
                  <svg 
                    className="del-btn__icon" 
                    viewBox="0 0 24 24" 
                    width="18" height="18" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2"
                  >
                    <g className="del-btn__icon-lid">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      {/* Path for the lid handle part, M8 6 V4 A2 2 0 0 1 10 2 H14 A2 2 0 0 1 16 4 V6 */}
                      <path d="M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6"></path>
                    </g>
                    <g className="del-btn__icon-can">
                      {/* Path for the can body part, M19 6V20 A2 2 0 0 1 17 22 H7 A2 2 0 0 1 5 20 V6 */}
                      <path d="M19 6V20A2 2 0 0 1 17 22H7A2 2 0 0 1 5 20V6"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </g>
                  </svg>
                  <span className="del-btn__letters">
                    <span className="del-btn__letter-box"><span className="del-btn__letter">R</span></span>
                    <span className="del-btn__letter-box"><span className="del-btn__letter">E</span></span>
                    <span className="del-btn__letter-box"><span className="del-btn__letter">M</span></span>
                    <span className="del-btn__letter-box"><span className="del-btn__letter">O</span></span>
                    <span className="del-btn__letter-box"><span className="del-btn__letter">V</span></span>
                    <span className="del-btn__letter-box"><span className="del-btn__letter">E</span></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>You have no favorite locations yet. Add some from the map!</p>
        )}
      </div>

      <div className="profile-section account-actions">
        <h2>Account Actions</h2>
        <button type="button" onClick={() => setShowDeleteModal(true)} className="delete-account-button styled-button-danger">
          Delete My Account
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

export default UserProfileDisplay;
