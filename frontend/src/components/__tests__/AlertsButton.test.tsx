import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertsButton from '../AlertsButton';
import { fetchAlerts } from '../../api/weather';
import { vi, Mock } from 'vitest';

vi.mock('../../api/weather', () => ({
  fetchAlerts: vi.fn(),
}));

// Mock the lazy‐loaded AlertsModal
vi.mock('../AlertsModal', () => ({
  default: ({ children, onClose }: any) => (
    <div data-testid="alerts-modal">
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('AlertsButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (fetchAlerts as unknown as Mock).mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('when no location is passed, does not fetch and shows No alerts', () => {
    render(<AlertsButton location="" />);
    expect(fetchAlerts).not.toHaveBeenCalled();
    const btn = screen.getByRole('button', { name: /^Alerts$/i });
    expect(btn).toHaveAttribute('title', 'No alerts');
  });

  it('fetches alerts and when no alerts returned, still shows No alerts', async () => {
    (fetchAlerts as unknown as Mock).mockResolvedValueOnce([]);
    render(<AlertsButton location="Paris" />);

    act(() => vi.advanceTimersByTime(300));
    await act(() => Promise.resolve());

    expect(fetchAlerts).toHaveBeenCalledWith('Paris');
    const btn = screen.getByRole('button', { name: /^Alerts$/i });
    expect(btn).not.toHaveClass('glow');
    expect(btn).toHaveAttribute('title', 'No alerts');
  });

  it('shows an error message if fetchAlerts throws', async () => {
    (fetchAlerts as unknown as Mock).mockRejectedValueOnce(new Error('Network fail'));
    render(<AlertsButton location="Rome" />);

    act(() => vi.advanceTimersByTime(300));
    await act(() => Promise.resolve());

    expect(screen.getByText(/Network fail/i)).toBeInTheDocument();
  });

  it('when alerts are returned, button glows and shows count; clicking opens modal with items', async () => {
    const sample = [{
      headline: 'Storm',
      event: 'Thunderstorm',
      msgtype: 'Alert',
      urgency: 'Immediate',
      effective: '2025-04-20T09:00:00Z',
      expires: '2025-04-20T12:00:00Z',
      desc: 'Severe thunderstorm warning',
    }];
    (fetchAlerts as unknown as Mock).mockResolvedValueOnce(sample);

    render(<AlertsButton location="Berlin" />);

    // advance past debounce and flush fetch promise
    act(() => vi.advanceTimersByTime(300));
    await act(() => Promise.resolve());

    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('glow');
    expect(btn).toHaveTextContent(/\(1\)/);

    // click to open Suspense‐wrapped modal
    fireEvent.click(btn);

    // flush the lazy import resolution
    await act(() => Promise.resolve());

    expect(screen.getByTestId('alerts-modal')).toBeInTheDocument();
    expect(screen.getByText(/Weather Alerts for Berlin/i)).toBeInTheDocument();
    expect(screen.getByText('Storm')).toBeInTheDocument();
    expect(screen.getByText(/Thunderstorm/)).toBeInTheDocument();
  });

  it('opens modal and shows "No alerts available." when alerts array is empty', async () => {
    (fetchAlerts as unknown as Mock).mockResolvedValueOnce([]);
    render(<AlertsButton location="NYC" />);

    act(() => vi.advanceTimersByTime(300));
    await act(() => Promise.resolve());

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    await act(() => Promise.resolve());

    expect(screen.getByTestId('alerts-modal')).toBeInTheDocument();
    expect(screen.getByText(/No alerts available\./i)).toBeInTheDocument();
  });
});