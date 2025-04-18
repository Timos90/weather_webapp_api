import React, { useState } from 'react';
import { registerUser } from '../api/user';
import '../css/RegisterModal.css';
import { RegisterModalProps } from '../types/types';

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [preferredUnit, setPreferredUnit] = useState('C');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [success, setSuccess] = useState('');
  const [generalError, setGeneralError] = useState('');

  if (!isOpen) return null;

  const clearAllErrors = () => {
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setLocationError('');
    setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAllErrors();
    setSuccess('');

    try {
      await registerUser(username, email, password, location, preferredUnit);
      setSuccess('Registration successful! You can now log in.');
      setUsername('');
      setEmail('');
      setPassword('');
      setLocation('');
      setPreferredUnit('C');
    } catch (err: any) {
      if (typeof err === 'object' && err !== null) {
        parseFieldErrors(err);
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Registration failed. Please try again.');
      }
    }
  };

  const parseFieldErrors = (errorsObj: any) => {
    if (errorsObj.username) {
      setUsernameError(errorsObj.username.join(', '));
    }
    if (errorsObj.email) {
      setEmailError(errorsObj.email.join(', '));
    }
    if (errorsObj.password) {
      setPasswordError(errorsObj.password.join(', '));
    }
    if (errorsObj.location) {
      setLocationError(errorsObj.location.join(', '));
    }
    if (errorsObj.non_field_errors) {
      setGeneralError(errorsObj.non_field_errors.join(', '));
    }
    if (typeof errorsObj === 'object') {
      Object.keys(errorsObj).forEach((key) => {
        if (
          key !== 'username' &&
          key !== 'email' &&
          key !== 'password' &&
          key !== 'location' &&
          key !== 'non_field_errors'
        ) {
          setGeneralError(`Error in ${key}: ${errorsObj[key].join(', ')}`);
        }
      });
    }
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="register-modal-overlay"
      onClick={() => {
        onClose();
        clearAllErrors();
        setSuccess('');
        setUsername('');
        setEmail('');
        setPassword('');
        setLocation('');
        setPreferredUnit('C');
      }}
    >
      <div className="register-modal-content" onClick={stopPropagation}>
        <button
          className="register-modal-close"
          onClick={() => {
            onClose();
            clearAllErrors();
            setSuccess('');
            setUsername('');
            setEmail('');
            setPassword('');
            setLocation('');
            setPreferredUnit('C');
          }}
        >
          X
        </button>
        <h2>Register</h2>
        {success && <p className="register-success">{success}</p>}
        {generalError && <p className="register-error">{generalError}</p>}
        <form data-testid="register-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username-input">Username:</label>
            <input
              id="username-input"
              data-testid="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {usernameError && (
              <p className="register-error" style={{ marginTop: '4px' }}>
                {usernameError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email-input">Email:</label>
            <input
              id="email-input"
              data-testid="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailError && (
              <p className="register-error" style={{ marginTop: '4px' }}>
                {emailError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password-input">Password:</label>
            <input
              id="password-input"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && (
              <p className="register-error" style={{ marginTop: '4px' }}>
                {passwordError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="location-input">Location:</label>
            <input
              id="location-input"
              data-testid="location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            {locationError && (
              <p className="register-error" style={{ marginTop: '4px' }}>
                {locationError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="preferred-unit">Preferred Temperature Unit:</label>
            <select
              id="preferred-unit"
              data-testid="preferred-unit"
              value={preferredUnit}
              onChange={(e) => setPreferredUnit(e.target.value)}
            >
              <option value="C">Celsius</option>
              <option value="F">Fahrenheit</option>
            </select>
          </div>
          <button type="submit">Register</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
