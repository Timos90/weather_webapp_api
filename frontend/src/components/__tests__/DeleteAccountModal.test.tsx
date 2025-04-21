import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAccountModal from '../DeleteAccountModal';
import * as userApi from '../../api/user';

describe('DeleteAccountModal Component', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose.mockClear();
  });

  it('renders title, prompt, input and delete button', () => {
    render(<DeleteAccountModal onClose={onClose} />);
    expect(screen.getByRole('heading', { name: /confirm account deletion/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('calls onClose when clicking overlay', () => {
    render(<DeleteAccountModal onClose={onClose} />);
    // overlay is the first div with className="modal-overlay"
    fireEvent.click(screen.getByText(/confirm account deletion/i).parentElement!.parentElement!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the close button', () => {
    render(<DeleteAccountModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits and on successful delete shows alert and redirects', async () => {
    const fakeEmail = 'me@example.com';
    vi.stubGlobal('alert', vi.fn());
    // Spy on window.location.href setter
    delete (window as any).location;
    (window as any).location = { href: '' };
    vi.spyOn(userApi, 'deleteUserAccount').mockResolvedValueOnce(undefined);

    render(<DeleteAccountModal onClose={onClose} />);
    const input = screen.getByPlaceholderText(/enter your email/i);
    fireEvent.change(input, { target: { value: fakeEmail } });
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    await waitFor(() => {
      expect(userApi.deleteUserAccount).toHaveBeenCalledWith(fakeEmail);
      expect(alert).toHaveBeenCalledWith('Your account has been deleted.');
      expect(window.location.href).toBe('/');
    });
  });

  it('displays error message when deletion fails', async () => {
    const fakeEmail = 'you@fail.com';
    const errorMessage = 'Network failed';
    vi.spyOn(userApi, 'deleteUserAccount').mockRejectedValueOnce(new Error(errorMessage));

    render(<DeleteAccountModal onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: fakeEmail },
    });
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    await waitFor(() => {
      expect(userApi.deleteUserAccount).toHaveBeenCalledWith(fakeEmail);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
