// frontend/src/components/__tests__/LoginModal.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from '../LoginModal';
import { loginUser } from '../../api/user';

jest.mock('../../api/user', () => ({
  loginUser: jest.fn(),
}));

describe('LoginModal Component (Jest)', () => {
  const onClose = jest.fn();
  const onLoginSuccess = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
    onLoginSuccess.mockClear();
    loginUser.mockClear();
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <LoginModal isOpen={false} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders modal elements when isOpen is true', () => {
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    // Use getByRole to specifically check for the heading.
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    // Check inputs by their associated label.
    expect(screen.getByLabelText(/Username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Remember me/i)).toBeInTheDocument();
    // Verify the submit button.
    expect(screen.getByRole('button', { name: /^Login$/i })).toBeInTheDocument();
  });

  test('toggles password visibility when clicking the toggle button', () => {
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    const passwordInput = screen.getByLabelText(/Password:/i);
    const toggleButton = screen.getByRole('button', { name: /Show/i });
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(toggleButton.textContent).toBe('Hide');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(toggleButton.textContent).toBe('Show');
  });

  test('calls loginUser and triggers callbacks on successful submission', async () => {
    loginUser.mockResolvedValue({ token: 'fake-token' });

    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    const usernameInput = screen.getByLabelText(/Username:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const form = screen.getByTestId('login-form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith('testuser', 'testpass');
      expect(onLoginSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('resets fields and displays error on failed login', async () => {
    loginUser.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    const usernameInput = screen.getByLabelText(/Username:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const form = screen.getByTestId('login-form');

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith('wronguser', 'wrongpass');
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      expect(usernameInput.value).toBe('');
      expect(passwordInput.value).toBe('');
      expect(onLoginSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
