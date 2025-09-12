import React, { useState } from 'react';
import { registerUser } from '../api/user';
import '../css/RegisterModal.css';
import { RegisterModalProps, GenderOption } from '../types/types';

/**
 * A modal component for new user registration.
 * Collects username, email, password, location, preferred temperature unit, and gender.
 * Handles form submission, calls the registration API, and provides success or error feedback.
 *
 * @param {RegisterModalProps} props - The props for the component.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {() => void} props.onClose - Callback function to close the modal.
 * @returns {React.ReactElement | null} The registration modal or null if not open.
 */
const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  /** State for the username input field. */
  const [username, setUsername] = useState('');
  /** State for the email input field. */
  const [email, setEmail] = useState('');
  /** State for the password input field. */
  const [password, setPassword] = useState('');
  /** State for the location input field. */
  const [location, setLocation] = useState('');
  /** State for the preferred temperature unit selection ('C' or 'F'). Defaults to 'C'. */
  const [preferredUnit, setPreferredUnit] = useState('C');
  /** State for the gender selection. Defaults to 'Man'. */
  const [gender, setGender] = useState<GenderOption>('Man');
  /** State for storing username validation error messages. */
  const [usernameError, setUsernameError] = useState('');
  /** State for storing email validation error messages. */
  const [emailError, setEmailError] = useState('');
  /** State for storing password validation error messages. */
  const [passwordError, setPasswordError] = useState('');
  /** State for storing location validation error messages. */
  const [locationError, setLocationError] = useState('');
  /** State for storing success messages (e.g., after successful registration). */
  const [success, setSuccess] = useState('');
  /** State for storing general error messages (e.g., API call failures not specific to a field). */
  const [generalError, setGeneralError] = useState('');

  if (!isOpen) return null;

  /**
   * Clears all individual field error messages and the general error message.
   * Called before a new form submission attempt or when the modal is closed.
   */
  const clearAllErrors = () => {
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setLocationError('');
    setGeneralError('');
  };

  /**
   * Handles the registration form submission.
   * Prevents default form action, clears previous errors and success messages.
   * Calls the `registerUser` API with the collected user data.
   * On success, sets a success message and resets the form fields.
   * On failure, parses and displays field-specific or general error messages.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAllErrors();
    setSuccess('');

    try {
      await registerUser(username, email, password, location, preferredUnit, gender);
      setSuccess('Registration successful! You can now log in.');
      setUsername('');
      setEmail('');
      setPassword('');
      setLocation('');
      setPreferredUnit('C');
      setGender('Man');
    } catch (err: any) {
      // Check for the custom API error structure from apiHelpers
      if (err && err.isApiError && err.data) {
        parseFieldErrors(err.data);
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('An unexpected error occurred during registration.');
      }
    }
  };

  /**
   * Parses an error object (typically from an API response) and assigns messages
   * to the appropriate field-specific error states (e.g., `usernameError`, `emailError`).
   * Handles `non_field_errors` and any other unexpected errors by setting a general error message.
   * @param {any} errorsObj - The error object from the API, expected to contain field names as keys.
   */
  const parseFieldErrors = (errorsObj: any) => {
    const formatError = (error: string | string[]): string => {
      return Array.isArray(error) ? error.join(', ') : error;
    };

    if (errorsObj.username) {
      setUsernameError(formatError(errorsObj.username));
    }
    if (errorsObj.email) {
      setEmailError(formatError(errorsObj.email));
    }
    if (errorsObj.password) {
      setPasswordError(formatError(errorsObj.password));
    }
    if (errorsObj.location) {
      setLocationError(formatError(errorsObj.location));
    }
    if (errorsObj.non_field_errors) {
      setGeneralError(formatError(errorsObj.non_field_errors));
    }

    // Handle any other unexpected field errors
    Object.keys(errorsObj).forEach((key) => {
      if (!['username', 'email', 'password', 'location', 'non_field_errors'].includes(key)) {
        const message = formatError(errorsObj[key]);
        setGeneralError((prev) => prev ? `${prev}\nError in ${key}: ${message}` : `Error in ${key}: ${message}`);
      }
    });
  };

  /**
   * Stops event propagation for mouse events on the modal content.
   * This prevents the modal from closing when clicking inside the content area,
   * as the overlay click handler is responsible for closing.
   * @param {React.MouseEvent} e - The mouse event.
   */
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
        setGender('Man');
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
            setGender('Man');
          }}
        >
          X
        </button>
        <h2>Register</h2>
                {success && (
          <p className="register-success">
            {success}{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin?.(); }} className="login-link">
              HERE
            </a>
          </p>
        )}
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
          <div>
            <label htmlFor="gender-select">Gender:</label>
            <select
              id="gender-select"
              data-testid="gender-select"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderOption)}
              required
            >
              <option value="Man">Man</option>
              <option value="Woman">Woman</option>
              <option value="Non-binary">Non-binary</option>
            </select>
          </div>
          <button type="submit">Register</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
