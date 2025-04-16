// AlertsModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AlertsModal from '../AlertsModal';

describe('AlertsModal Component (Jest)', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the children inside modal content', () => {
    render(
      <AlertsModal onClose={mockOnClose}>
        <div data-testid="modal-child">Test Content</div>
      </AlertsModal>
    );

    // Assert that the child element is rendered.
    const childElement = screen.getByTestId('modal-child');
    expect(childElement).toBeInTheDocument();
    expect(childElement).toHaveTextContent('Test Content');
  });

  test('calls onClose when clicking the overlay', () => {
    const { container } = render(
      <AlertsModal onClose={mockOnClose}>
        <div>Modal Content</div>
      </AlertsModal>
    );

    // Get the overlay element by its CSS class.
    const overlay = container.querySelector('.modal-overlay');
    expect(overlay).toBeInTheDocument();

    // Simulate a click on the overlay.
    fireEvent.click(overlay);

    // Expect the onClose callback to have been called once.
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when clicking inside the modal content', () => {
    const { container } = render(
      <AlertsModal onClose={mockOnClose}>
        <div data-testid="modal-content">Content</div>
      </AlertsModal>
    );

    // Get the modal content element.
    const content = container.querySelector('.modal-content');
    expect(content).toBeInTheDocument();

    // Simulate a click inside the modal content.
    fireEvent.click(content);

    // onClose should not be called when clicking inside the content.
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
