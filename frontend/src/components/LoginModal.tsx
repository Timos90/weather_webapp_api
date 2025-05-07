import React, { useState, useEffect } from 'react';
import { loginUser } from '../api/user';
import '../css/LoginModal.css';
import { LoginModalProps } from '../types/types';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const rememberedUsername = localStorage.getItem('remembered_username');
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
  }, []);

  if (!isOpen) return null;

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

  const stopPropagation: React.MouseEventHandler<HTMLDivElement> = (e) => e.stopPropagation();

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
