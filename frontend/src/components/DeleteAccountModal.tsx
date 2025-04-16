// DeleteAccountModal.tsx
import React, { useState } from 'react';
import { deleteUserAccount } from '../api/user';
import '../css/ProfileModal.css'; // You can reuse your modal CSS

interface DeleteAccountModalProps {
  onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose }) => {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await deleteUserAccount(emailInput);
      alert('Your account has been deleted.');
      // Optionally, redirect to the homepage or login page:
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
