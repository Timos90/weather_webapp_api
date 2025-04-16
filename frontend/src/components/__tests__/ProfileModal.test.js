// ProfileModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../ProfileModal'; // This is the ProfileModal component that is exported as Modal

describe('ProfileModal Component (Jest)', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children and the close button inside modal content', () => {
    render(
      <Modal onClose={mockOnClose}>
        <div data-testid="child-content">Modal Child Content</div>
      </Modal>
    );

    // Verify that the child content is rendered
    const childContent = screen.getByTestId('child-content');
    expect(childContent).toBeInTheDocument();
    expect(childContent).toHaveTextContent('Modal Child Content');

    // Verify that the close button exists
    const closeButton = screen.getByRole('button', { name: /X/i });
    expect(closeButton).toBeInTheDocument();
  });

  test('calls onClose when clicking the overlay', () => {
    const { container } = render(
      <Modal onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    // Query the overlay by its CSS class
    const overlay = container.querySelector('.modal-overlay');
    expect(overlay).toBeInTheDocument();

    // Simulate a click on the overlay
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when clicking inside the modal content', () => {
    const { container } = render(
      <Modal onClose={mockOnClose}>
        <div data-testid="modal-content">Content</div>
      </Modal>
    );

    // Get the modal content element by its CSS class
    const modalContent = container.querySelector('.modal-content');
    expect(modalContent).toBeInTheDocument();

    // Simulate a click inside modal content
    fireEvent.click(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('calls onClose when clicking the close button', () => {
    render(
      <Modal onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    // Find the close button (by its accessible name "X")
    const closeButton = screen.getByRole('button', { name: /X/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
