import React, { useState, useEffect } from 'react';
import { loginUser } from '../api/user';
import '../css/LoginModal.css';
import { LoginModalProps } from '../types/types';

/**
 * A modal component for user login.
 * Provides fields for username and password, a 'Remember me' option, a password visibility toggle,
 * and Caps Lock detection. Handles form submission, API calls for login, and feedback to the user.
 *
 * @param {LoginModalProps} props - The props for the component.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {() => void} props.onClose - Callback function to close the modal.
 * @param {() => void} [props.onLoginSuccess] - Optional callback function triggered on successful login.
 * @returns {React.ReactElement | null} The login modal or null if not open.
 */
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  /** State for the username input field. */
  const [username, setUsername] = useState('');
  /** State for the password input field. */
  const [password, setPassword] = useState('');
  /** State to toggle password visibility (show/hide). */
  const [showPassword, setShowPassword] = useState(false);
  /** State for the 'Remember me' checkbox. */
  const [rememberMe, setRememberMe] = useState(false);
  /** State to indicate if Caps Lock is active in the password field. */
  const [capsLockOn, setCapsLockOn] = useState(false);
  /** State for storing login error messages. */
  const [error, setError] = useState('');

  /**
   * useEffect hook to check for a remembered username in localStorage when the component mounts.
   * If found, it pre-fills the username field and checks the 'Remember me' box.
   */
  useEffect(() => {
    const rememberedUsername = localStorage.getItem('remembered_username');
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
  }, []);

  if (!isOpen) return null;

  /**
   * Handles the login form submission.
   * Prevents default form submission, calls the `loginUser` API, and on success,
   * stores the auth token in sessionStorage. Manages 'Remember me' functionality by saving/
   * removing the username from localStorage. Triggers `onLoginSuccess` callback, dispatches a
   * 'storage' event to notify other parts of the app, and closes the modal.
   * Sets an error message on failure.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      const data: { token: string } = await loginUser(username, password);
      if (data && data.token) {
        sessionStorage.setItem('auth_token', data.token);
        if (rememberMe) {
          localStorage.setItem('remembered_username', username);
        } else {
          localStorage.removeItem('remembered_username');
        }
      } else {
        throw new Error('Invalid login response. Token not found.');
      }
      onLoginSuccess?.();
      window.dispatchEvent(new Event('storage'));
      onClose();
    } catch (err) {
      setUsername('');
      setPassword('');
      setError(err instanceof Error ? err.message : 'Invalid username or password. Please try again.');
    }
  };

  /**
   * Stops event propagation for mouse events on the modal content.
   * This prevents the modal from closing when clicking inside the content area,
   * as the overlay click handler is responsible for closing.
   * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event.
   */
  const stopPropagation: React.MouseEventHandler<HTMLDivElement> = (e) => e.stopPropagation();

  /**
   * Detects if Caps Lock is active during key presses in the password input field.
   * Updates the `capsLockOn` state accordingly to display a warning to the user.
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   */
  const handleKeyPress: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const isCaps = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(isCaps);
  };

  return (
    <div
      className="login-modal-overlay"
      onClick={() => {
        onClose();
        setError('');
        setUsername('');
        setPassword('');
      }}
    >
      <div className="login-modal-content" onClick={stopPropagation}>
        <button
          className="login-modal-close"
          onClick={() => {
            onClose();
            setError('');
            setUsername('');
            setPassword('');
          }}
        >
          X
        </button>
        <h2>Login</h2>
        <form onSubmit={handleSubmit} data-testid="login-form">
          <div className="form-field">
            <label htmlFor="username-input">Username:</label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password-input">Password:</label>
            <div className="password-field">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                onKeyUp={handleKeyPress}
                required
              />
              <button
                type="button"
                className="show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {capsLockOn && <p style={{ color: 'orange' }}>Caps Lock is on!</p>}
          </div>
          <div className="remember-me-field">
            <label htmlFor="remember-me">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              Remember me
            </label>
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-submit-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
