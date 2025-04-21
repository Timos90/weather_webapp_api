import { render, screen, fireEvent, waitFor } from '@testing-library/react';
 import { vi, Mock} from 'vitest';        // ← ensure Mock type is available
 import RegisterModal from '../RegisterModal';
 import { registerUser } from '../../api/user';
 
 vi.mock('../../api/user', () => ({       // ← use vi.mock, not jest.mock
     registerUser: vi.fn(),
 }));
 
 describe('RegisterModal', () => {
     const onClose = vi.fn();
 
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
         ['username-input', 'email-input', 'password-input', 'location-input', 'preferred-unit']
             .forEach(testid => expect(screen.getByTestId(testid)).toBeInTheDocument());
         expect(screen.getByRole('button', { name: 'X' })).toBeInTheDocument();
         expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
     });
 
     it('allows editing inputs and selecting the unit', () => {
         render(<RegisterModal isOpen={true} onClose={onClose} />);
         fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'alice' } });
         fireEvent.change(screen.getByTestId('email-input'),    { target: { value: 'a@b.com' } });
         fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'secret' } });
         fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Paris' } });
         fireEvent.change(screen.getByTestId('preferred-unit'), { target: { value: 'F' } });
 
         expect(screen.getByTestId('username-input')).toHaveValue('alice');
         expect(screen.getByTestId('email-input')).toHaveValue('a@b.com');
         expect(screen.getByTestId('password-input')).toHaveValue('secret');
         expect(screen.getByTestId('location-input')).toHaveValue('Paris');
         expect(screen.getByTestId('preferred-unit')).toHaveValue('F');
     });
 
     it('on successful register clears fields and shows success message', async () => {
         (registerUser as Mock).mockResolvedValue(undefined);
 
         render(<RegisterModal isOpen={true} onClose={onClose} />);
         fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'bob' } });
         fireEvent.change(screen.getByTestId('email-input'),    { target: { value: 'b@b.com' } });
         fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'pw' } });
         fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'NY' } });
         fireEvent.submit(screen.getByTestId('register-form'));
 
         await waitFor(() => {
             expect(registerUser).toHaveBeenCalledWith('bob','b@b.com','pw','NY','C');
             expect(screen.getByText('Registration successful! You can now log in.')).toBeInTheDocument();
             expect(screen.getByTestId('username-input')).toHaveValue('');
             expect(screen.getByTestId('preferred-unit')).toHaveValue('C');
         });
     });
 
     it('displays field‑level and extra errors from API', async () => {
         const apiErr = {
             username: ['bad name'],
             email: ['taken'],
             password: ['too weak'],
             location: ['invalid'],
             non_field_errors: ['oops'],
             extra: ['foo']
         };
         (registerUser as Mock).mockRejectedValue(apiErr);
 
         render(<RegisterModal isOpen={true} onClose={onClose} />);
         fireEvent.submit(screen.getByTestId('register-form'));
 
         await waitFor(() => {
             expect(screen.getByText('bad name')).toBeInTheDocument();
             expect(screen.getByText('taken')).toBeInTheDocument();
             expect(screen.getByText('too weak')).toBeInTheDocument();
             expect(screen.getByText('invalid')).toBeInTheDocument();
             expect(screen.getByText('Error in extra: foo')).toBeInTheDocument();
         });
     });
 
     it('shows generic fallback when API throws a string', async () => {
         (registerUser as Mock).mockRejectedValue('some text error');
         render(<RegisterModal isOpen={true} onClose={onClose} />);
         fireEvent.submit(screen.getByTestId('register-form'));
 
         await waitFor(() => {
             expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
         });
     });
 
     it('closes when clicking the X button', () => {
         render(<RegisterModal isOpen={true} onClose={onClose} />);
         fireEvent.click(screen.getByRole('button', { name: 'X' }));
         expect(onClose).toHaveBeenCalledTimes(1);
     });
 
     it('closes when clicking outside the modal content', () => {
         const { container } = render(<RegisterModal isOpen={true} onClose={onClose} />);
         const overlay = container.querySelector('.register-modal-overlay')!;
         fireEvent.click(overlay);
         expect(onClose).toHaveBeenCalled();
     });
 });