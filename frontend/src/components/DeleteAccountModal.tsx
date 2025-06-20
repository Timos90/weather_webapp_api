import React, { useState } from 'react';
import { deleteUserAccount } from '../api/user';
import '../css/ProfileModal.css';

/**
 * Props for the DeleteAccountModal component.
 */
interface DeleteAccountModalProps {
  /** Callback function to close the modal. */
  onClose: () => void;
}

/**
 * A modal component for confirming and handling user account deletion.
 * Requires the user to enter their email to confirm the irreversible action.
 *
 * @param {DeleteAccountModalProps} props - The props for the component.
 * @returns {React.ReactElement} The account deletion confirmation modal.
 */
const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose }) => {
  /** State for the email input field used for account deletion confirmation. */
  const [emailInput, setEmailInput] = useState('');
  /** State for storing error messages related to the account deletion process. */
  const [error, setError] = useState('');

  /**
   * Handles the account deletion process on form submission.
   * Prevents default form action, calls the `deleteUserAccount` API with the entered email.
   * On success, alerts the user and redirects to the homepage.
   * On failure, sets an error message.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await deleteUserAccount(emailInput);
      alert('Your account has been deleted.');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>X</button>
        <h2>Confirm Account Deletion</h2>
        <p>Please enter your email to confirm deletion of your account. This action is irreversible.</p>
        <form onSubmit={handleDelete}>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Enter your email"
            required
            style={{ padding: '8px', margin: '10px 0', width: '100%' }}
          />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" style={{ padding: '10px 20px' }}>
            Delete Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
