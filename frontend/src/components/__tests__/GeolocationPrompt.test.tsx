import { render, screen, fireEvent } from '@testing-library/react';
import GeolocationPrompt from '../GeolocationPrompt';
import { vi } from 'vitest';

describe('GeolocationPrompt Component', () => {
  it('renders the prompt message', () => {
    render(<GeolocationPrompt onRequest={vi.fn()} />);
    expect(screen.getByText(/want local weather data\?/i)).toBeInTheDocument();
  });

  it('renders the "Use My Location" button with correct class', () => {
    render(<GeolocationPrompt onRequest={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /use my location/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('geo-button');
  });

  it('wraps everything in a div with class "geo-prompt"', () => {
    const { container } = render(<GeolocationPrompt onRequest={vi.fn()} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('geo-prompt');
  });

  it('calls onRequest when the button is clicked', () => {
    const onRequest = vi.fn();
    render(<GeolocationPrompt onRequest={onRequest} />);
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });
});
