import React from 'react';
import { useState, useEffect } from 'react';
import { fetchUserProfile, updateUserProfile } from '../api/user';
import { fetchFavoriteLocations, removeFromFavorites } from '../api/weather';
import '../css/UserProfilePage.css';
import '../css/deleteAnimation.css';
import { runDeleteAnimation } from '../utils/deleteAnimation.d';
import DeleteAccountModal from './DeleteAccountModal';
import { UserProfileProps as OriginalUserProfileProps, GenderOption } from '../types/types'; // Renamed to avoid conflict

// Extend original props to include the new callback
interface UserProfileProps extends OriginalUserProfileProps {
  onProfileDataChange?: (newGender: GenderOption) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onFavoriteClick, onFavoriteUpdated, onProfileDataChange }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [preferredTemperatureUnit, setPreferredTemperatureUnit] = useState<'C' | 'F'>('C');
  const [gender, setGender] = useState<GenderOption | undefined>(undefined);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile()
        .then((data) => {
          setLocation(data.location);
          setPreferredTemperatureUnit(data.preferred_temperature_unit === 'F' ? 'F' : 'C');
          setEmail(data.user.email);
          setUsername(data.user.username);
          setFirstName(data.user.first_name);
          setLastName(data.user.last_name);
          setGender(data.gender as GenderOption);
        })
        .catch(() => setGeneralError('Unable to fetch user profile.'));

      fetchFavoriteLocations()
        .then(setFavorites)
        .catch(() => setGeneralError('Unable to fetch favorite locations.'));
    }
  }, []);

  const handleToggleUnit = async () => {
    const newUnit = preferredTemperatureUnit === 'C' ? 'F' : 'C';
    setPreferredTemperatureUnit(newUnit);

    try {
      const updatedProfile = await updateUserProfile({
        preferred_temperature_unit: newUnit,
        location,
        email,
        first_name: firstName,
        last_name: lastName,
        username,
        gender: gender,
      });
      setPreferredTemperatureUnit(updatedProfile.preferred_temperature_unit);
      setGender(updatedProfile.gender as GenderOption);
      // Call the callback with the new gender
      if (updatedProfile.gender) {
        onProfileDataChange?.(updatedProfile.gender as GenderOption);
      }
    } catch (err) {
      setGeneralError('Failed to update unit preference.');
    }
  };

  const handleSave = async () => {
    setUsernameError('');
    setEmailError('');
    setFirstNameError('');
    setLastNameError('');
    setLocationError('');
    setGeneralError(null);

    try {
      const updatedProfile = await updateUserProfile({
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        location,
        preferred_temperature_unit: preferredTemperatureUnit,
        gender: gender,
      });

      setUsername(updatedProfile.user.username);
      setEmail(updatedProfile.user.email);
      setFirstName(updatedProfile.user.first_name);
      setLastName(updatedProfile.user.last_name);
      setLocation(updatedProfile.location);
      setPreferredTemperatureUnit(updatedProfile.preferred_temperature_unit);
      setGender(updatedProfile.gender as GenderOption);
      // Call the callback with the new gender
      if (updatedProfile.gender) {
        onProfileDataChange?.(updatedProfile.gender as GenderOption);
      }

      alert('Profile updated successfully!');
    } catch (err) {
      if (err instanceof Error) {
        parseAndAssignErrors(err.message);
      } else {
        setGeneralError('Failed to update profile.');
      }
    }
  };

  const parseAndAssignErrors = (msg: string) => {
    if (msg.includes('username')) {
      setUsernameError(msg);
    } else if (msg.includes('email')) {
      setEmailError(msg);
    } else if (msg.includes('location')) {
      setLocationError(msg);
    } else if (msg.includes('first_name')) {
      setFirstNameError(msg);
    } else if (msg.includes('last_name')) {
      setLastNameError(msg);
    } else {
      setGeneralError(msg);
    }
  };

  const handleDeleteFavorite = async (
    city_name: string,
    country_code: string,
    latitude: number,
    longitude: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    try {
      const btn = e.currentTarget;
      runDeleteAnimation(btn);

      setTimeout(async () => {
        await removeFromFavorites(city_name, country_code, latitude, longitude);

        setFavorites((prev) =>
          prev.filter(
            (f) =>
              !(
                f.city_name === city_name &&
                f.country_code === country_code &&
                f.latitude === latitude &&
                f.longitude === longitude
              )
          )
        );

        onFavoriteUpdated?.();
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setGeneralError(error.message);
      } else {
        setGeneralError('Failed to remove location from favorites.');
      }
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="user-profile-container">
      {generalError && <p style={{ color: 'red' }}>{generalError}</p>}

      <h1>Hello {username}</h1>

      <div>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {usernameError && <p style={{ color: 'red' }}>{usernameError}</p>}
      </div>

      <div>
        <label>Location:</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {locationError && <p style={{ color: 'red' }}>{locationError}</p>}
      </div>

      <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center' }}>
        <label style={{ marginRight: '8px' }}>Preferred Temperature Unit:</label>
        <label className="switch">
          <input
            type="checkbox"
            checked={preferredTemperatureUnit === 'F'}
            onChange={handleToggleUnit}
          />
          <span className="slider round"></span>
        </label>
        <span style={{ marginLeft: '0.5rem' }}>
          {preferredTemperatureUnit === 'C' ? 'Celsius' : 'Fahrenheit'}
        </span>
      </div>

      <div>
        <label>Gender:</label>
        <select
          id="gender-select"
          data-testid="gender-select"
          value={gender || ''}
          onChange={(e) => setGender(e.target.value as GenderOption)}
        >
          <option value="" disabled={gender !== undefined}>Select Gender</option>
          <option value="Man">Man</option>
          <option value="Woman">Woman</option>
          <option value="Non-binary">Non-binary</option>
        </select>
      </div>

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && <p style={{ color: 'red' }}>{emailError}</p>}
      </div>

      <div>
        <label>First Name:</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        {firstNameError && <p style={{ color: 'red' }}>{firstNameError}</p>}
      </div>

      <div>
        <label>Last Name:</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        {lastNameError && <p style={{ color: 'red' }}>{lastNameError}</p>}
      </div>

      <button className="save-btn" onClick={handleSave}>Save Changes</button>

      <button className="delete-account" onClick={() => setShowDeleteModal(true)}>
        Delete Account
      </button>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}

      <div className="favorites">
        <h3>Your Favorite Locations:</h3>
        {favorites.length > 0 ? (
          <ul>
            {favorites.map((fav) => (
              <li
                key={fav.id}
                style={{ cursor: 'pointer', marginBottom: '5px' }}
                onClick={() => onFavoriteClick(fav.city_name)}
              >
                <span className="favorite-text">{fav.city_name}, {fav.country_code}</span>
                <button
                  className="del-btn"
                  data-running="false"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFavorite(
                      fav.city_name,
                      fav.country_code,
                      fav.latitude,
                      fav.longitude,
                      e
                    );
                  }}
                >
                  <svg
                    className="del-btn__icon"
                    viewBox="0 0 48 48"
                    width="48"
                    height="48"
                    aria-hidden="true"
                  >
                    <clipPath id="can-clip">
                      <rect
                        className="del-btn__icon-can-fill"
                        x="5"
                        y="24"
                        width="14"
                        height="11"
                      />
                    </clipPath>
                    <g
                      fill="none"
                      stroke="#fff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      transform="translate(12,12)"
                    >
                      <g className="del-btn__icon-lid">
                        <polyline points="9,5 9,1 15,1 15,5" />
                        <polyline points="4,5 20,5" />
                      </g>
                      <g className="del-btn__icon-can">
                        <g strokeWidth="0">
                          <polyline id="can-fill" points="6,10 7,23 17,23 18,10" />
                          <use
                            clipPath="url(#can-clip)"
                            href="#can-fill"
                            fill="#fff"
                          />
                        </g>
                        <polyline points="6,10 7,23 17,23 18,10" />
                      </g>
                    </g>
                  </svg>
                  <span className="del-btn__letters">
                    <span className="del-btn__letter-box">
                      <span className="del-btn__letter">R</span>
                    </span>
                    <span className="del-btn__letter-box">
                      <span className="del-btn__letter">E</span>
                    </span>
                    <span className="del-btn__letter-box">
                      <span className="del-btn__letter">M</span>
                    </span>
                    <span className="del-btn__letter-box">
                      <span className="del-btn__letter">O</span>
                    </span>
                    <span className="del-btn__letter-box">
                      <span className="del-btn__letter">V</span>
                    </span>
                    <span className="del-btn__letter-box">
                      <span className="del-btn__letter">E</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No favorite locations added yet.</p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
