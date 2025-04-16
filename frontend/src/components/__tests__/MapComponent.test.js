// src/components/__tests__/MapComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MapComponent from '../MapComponent';

// Create a dummy onLayerChange callback using jest.fn()
const defaultProps = {
  lat: 40.7128,
  lon: -74.0060,
  zoom: 10,
  layer: 'temp_new',
  apiKey: 'fake-api-key',
  onLayerChange: jest.fn(),
};

describe('MapComponent', () => {
  beforeEach(() => {
    // Reset the mock between tests
    defaultProps.onLayerChange.mockReset();
  });

  it('renders the map container and layer buttons', () => {
    render(<MapComponent {...defaultProps} />);
    
    // Check that the outer container exists
    const mapDisplay = document.querySelector('.map-display');
    expect(mapDisplay).toBeInTheDocument();

    // Check for the presence of each layer button
    expect(screen.getByRole('button', { name: /Temperature/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wind/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clouds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Precip/i })).toBeInTheDocument();

    // Check that the map container exists (using the class)
    const mapContainer = document.querySelector('.map');
    expect(mapContainer).toBeInTheDocument();
  });

  it('calls onLayerChange with the correct argument when a button is clicked', () => {
    render(<MapComponent {...defaultProps} />);
    
    // Find the Wind button and simulate a click
    const windButton = screen.getByRole('button', { name: /Wind/i });
    fireEvent.click(windButton);

    expect(defaultProps.onLayerChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onLayerChange).toHaveBeenCalledWith('wind_new');
  });
});
