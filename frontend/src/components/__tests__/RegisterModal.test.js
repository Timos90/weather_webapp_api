// frontend/src/components/__tests__/RegisterModal.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterModal from '../RegisterModal';
import { registerUser } from '../../api/user';

// Stub the registerUser API call
jest.mock('../../api/user', () => ({
  registerUser: jest.fn(),
}));

describe('RegisterModal Component (Jest)', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
    registerUser.mockClear();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<RegisterModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal elements when isOpen is true', () => {
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    
    // Check for the heading
    expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();
    
    // Check that each input/select appears by its test id
    expect(screen.getByTestId('username-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('location-input')).toBeInTheDocument();
    expect(screen.getByTestId('preferred-unit')).toBeInTheDocument();
    // Check for the form submit button
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  it('submits the form successfully and resets fields with success message', async () => {
    // Simulate a successful registration
    registerUser.mockResolvedValue({});
    
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    
    fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'TestCity' } });
    fireEvent.change(screen.getByTestId('preferred-unit'), { target: { value: 'F' } });
    
    fireEvent.submit(screen.getByTestId('register-form'));
    
    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith(
        'newuser',
        'newuser@example.com',
        'password123',
        'TestCity',
        'F'
      );
    });
    
    // Check that a success message is rendered
    expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument();
    
    // Verify that the fields have been reset (assuming the component resets the preferred unit to 'C')
    expect(screen.getByTestId('username-input').value).toBe('');
    expect(screen.getByTestId('email-input').value).toBe('');
    expect(screen.getByTestId('password-input').value).toBe('');
    expect(screen.getByTestId('location-input').value).toBe('');
    expect(screen.getByTestId('preferred-unit').value).toBe('C');
  });
  
  it('displays field-level errors on failed registration', async () => {
    // Simulate registerUser rejecting with field errors
    const errorResponse = {
      username: ['Username is required.'],
      email: ['Invalid email address.']
    };
    registerUser.mockRejectedValue(errorResponse);
    
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    
    // Attempt to submit with invalid data
    fireEvent.change(screen.getByTestId('username-input'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'pass' } });
    fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'TestCity' } });
    
    fireEvent.submit(screen.getByTestId('register-form'));
    
    await waitFor(() => {
      expect(screen.getByText(/Username is required./i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid email address./i)).toBeInTheDocument();
    });
  });
  
  it('calls onClose when clicking the close button', () => {
    render(<RegisterModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /X/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
