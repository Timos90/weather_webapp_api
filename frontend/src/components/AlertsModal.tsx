// Modal.tsx
import React from 'react';
import '../css/AlertsModal.css';
import { ModalProps } from '../types/types';

const AlertsModal: React.FC<ModalProps> = ({ onClose, children }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default AlertsModal;
