// DeleteAccountModal.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAccountModal from '../DeleteAccountModal';
import { deleteUserAccount } from '../../api/user';

// Mock the API function
jest.mock('../../api/user', () => ({
  deleteUserAccount: jest.fn(),
}));

describe('DeleteAccountModal Component', () => {
  let originalAlert;
  let originalLocationHref;

  beforeEach(() => {
    // Save original functions/properties.
    originalAlert = window.alert;
    originalLocationHref = window.location.href;

    // Stub out window.alert.
    window.alert = jest.fn();

    // Override window.location.href by deleting location and reassigning.
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    // Restore the originals.
    window.alert = originalAlert;
    window.location.href = originalLocationHref;
    jest.clearAllMocks();
  });

  test('calls onClose when clicking on the overlay', () => {
    const mockOnClose = jest.fn();
    const { container } = render(<DeleteAccountModal onClose={mockOnClose} />);
    const overlay = container.querySelector('.modal-overlay');
    expect(overlay).toBeInTheDocument();

    // Click on the overlay.
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose when clicking the close button', () => {
    const mockOnClose = jest.fn();
    render(<DeleteAccountModal onClose={mockOnClose} />);
    const closeButton = screen.getByRole('button', { name: /x/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('submits the form and calls deleteUserAccount successfully', async () => {
    const mockOnClose = jest.fn();
    const testEmail = 'test@example.com';
    // Simulate a successful deletion.
    deleteUserAccount.mockResolvedValueOnce({});
    render(<DeleteAccountModal onClose={mockOnClose} />);

    // Find and fill the email input field.
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    fireEvent.change(emailInput, { target: { value: testEmail } });

    // Find and click the submit button.
    const submitButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(submitButton);

    // Wait for side effects.
    await waitFor(() => {
      expect(deleteUserAccount).toHaveBeenCalledWith(testEmail);
      expect(window.alert).toHaveBeenCalledWith('Your account has been deleted.');
      expect(window.location.href).toBe('/');
    });
  });

  test('displays an error message when deletion fails', async () => {
    const mockOnClose = jest.fn();
    const testEmail = 'test@example.com';
    const errorMessage = 'Deletion failed due to server error';
    // Simulate a failed deletion.
    deleteUserAccount.mockRejectedValueOnce(new Error(errorMessage));
    render(<DeleteAccountModal onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    fireEvent.change(emailInput, { target: { value: testEmail } });

    const submitButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(submitButton);

    // Wait for the error message to appear.
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});
