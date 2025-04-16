// src/components/__tests__/AlertsButton.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AlertsButton from '../AlertsButton';
import { fetchAlerts } from '../../api/weather'; // adjust the path as needed

// Mock the fetchAlerts function
jest.mock('../../api/weather', () => ({
  fetchAlerts: jest.fn(),
}));

describe('AlertsButton Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch alerts when no location is provided', () => {
    render(<AlertsButton location="" />);
    expect(fetchAlerts).not.toHaveBeenCalled();

    // Check that the Alerts button is rendered
    const button = screen.getByRole('button', { name: /Alerts/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveClass('glow');
  });

  it('fetches alerts and displays glow with count when alerts are available', async () => {
    // Sample alerts data
    const sampleAlerts = [
      {
        headline: "Alert 1",
        msgtype: "info",
        urgency: "immediate",
        event: "Event1",
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
        desc: "Description 1",
      },
    ];

    fetchAlerts.mockResolvedValueOnce(sampleAlerts);

    render(<AlertsButton location="Test City" />);

    // Wait until fetchAlerts is called and state updates occur.
    await waitFor(() => expect(fetchAlerts).toHaveBeenCalledWith("Test City"));

    // The alerts button should now have the glow class and display the count
    const button = screen.getByRole('button', { name: /Alerts \(1\)/i });
    expect(button).toHaveClass('glow');
  });

  it('displays an error message when fetchAlerts fails', async () => {
    fetchAlerts.mockRejectedValueOnce(new Error("Fetch error"));

    render(<AlertsButton location="Test City" />);

    await waitFor(() => expect(fetchAlerts).toHaveBeenCalledWith("Test City"));

    // Verify that the error message appears on the screen
    await waitFor(() =>
      expect(screen.getByText(/Fetch error/i)).toBeInTheDocument()
    );
  });

  it('opens the modal with alerts details when the alerts button is clicked', async () => {
    const sampleAlerts = [
      {
        headline: "Alert 1",
        msgtype: "info",
        urgency: "immediate",
        event: "Event1",
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
        desc: "Description 1",
      },
    ];
    fetchAlerts.mockResolvedValueOnce(sampleAlerts);

    render(<AlertsButton location="Test City" />);

    await waitFor(() => expect(fetchAlerts).toHaveBeenCalledWith("Test City"));

    // Click the alerts button to open the modal
    const button = screen.getByRole('button', { name: /Alerts/i });
    fireEvent.click(button);

    // Verify that the modal appears with a heading containing the location
    await waitFor(() =>
      expect(screen.getByText(/Weather Alerts for Test City/i)).toBeInTheDocument()
    );
  });
});
