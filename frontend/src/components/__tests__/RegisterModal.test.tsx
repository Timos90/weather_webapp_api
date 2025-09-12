import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import RegisterModal from '../RegisterModal';
import { registerUser } from '../../api/user';

vi.mock('../../api/user', () => ({
  registerUser: vi.fn(),
}));

describe('RegisterModal', () => {
  const onClose = vi.fn();
  const onSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<RegisterModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all fields and controls when open', () => {
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
    ['username-input', 'email-input', 'password-input', 'location-input', 'preferred-unit'].forEach((testid) =>
      expect(screen.getByTestId(testid)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'X' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  it('on successful register, shows success message with login link', async () => {
    (registerUser as Mock).mockResolvedValue(undefined);
    render(<RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />);
    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(screen.getByText('Registration successful! You can now log in.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'HERE' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('link', { name: 'HERE' }));
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it('displays field-level errors from API', async () => {
    const apiErr = { isApiError: true, data: { username: ['bad name'], email: ['taken'] } };
    (registerUser as Mock).mockRejectedValue(apiErr);
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(screen.getByText('bad name')).toBeInTheDocument();
      expect(screen.getByText('taken')).toBeInTheDocument();
    });
  });

  it('shows generic fallback for non-API errors', async () => {
    (registerUser as Mock).mockRejectedValue(new Error('Network Error'));
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('shows generic fallback for unexpected error types', async () => {
    (registerUser as Mock).mockRejectedValue('a string error');
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred during registration.')).toBeInTheDocument();
    });
  });
});
