import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from '../LoginModal';
import { loginUser } from '../../api/user';

import { vi, Mock } from 'vitest';

vi.mock('../../api/user', () => ({ loginUser: vi.fn() }));

describe('LoginModal Component', () => {
  const onClose = vi.fn();
  const onLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LoginModal isOpen={false} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders form fields and close button when open', () => {
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /x/i })).toBeInTheDocument();
  });

  it('clicking overlay or close resets fields and calls onClose', () => {
    const { container, rerender } = render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );

    // click close button
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // reopen and click overlay
    rerender(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    const overlay = container.querySelector('.login-modal-overlay');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('loads remembered username from localStorage', () => {
    localStorage.setItem('remembered_username', 'user1');
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    expect(screen.getByLabelText(/username/i)).toHaveValue('user1');
    expect(screen.getByLabelText(/remember me/i)).toBeChecked();
  });

  it('toggles password visibility', () => {
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    const pwdInput = screen.getByLabelText(/password/i);
    const toggleBtn = screen.getByRole('button', { name: /show/i });
    expect(pwdInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtn);
    expect(pwdInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtn);
    expect(pwdInput).toHaveAttribute('type', 'password');
  });

  it('handles successful login and rememberMe', async () => {
    (loginUser as Mock).mockResolvedValue({ token: 'abc' });
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByLabelText(/remember me/i));
    fireEvent.submit(screen.getByTestId('login-form'));

    await waitFor(() => expect(loginUser).toHaveBeenCalledWith('user', 'pass'));
    expect(sessionStorage.getItem('auth_token')).toBe('abc');
    expect(localStorage.getItem('remembered_username')).toBe('user');
    expect(onLoginSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles login error and clears fields', async () => {
    (loginUser as Mock).mockRejectedValue(new Error('fail'));
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.submit(screen.getByTestId('login-form'));

    await waitFor(() => expect(screen.getByText(/fail/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/username/i)).toHaveValue('');
    expect(screen.getByLabelText(/password/i)).toHaveValue('');
  });

  it('handles invalid login response (no token)', async () => {
    (loginUser as Mock).mockResolvedValue({});
    render(
      <LoginModal isOpen={true} onClose={onClose} onLoginSuccess={onLoginSuccess} />
    );
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.submit(screen.getByTestId('login-form'));

    await waitFor(() => expect(screen.getByText(/invalid login response/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/username/i)).toHaveValue('');
    expect(screen.getByLabelText(/password/i)).toHaveValue('');
  });
});
