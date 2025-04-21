import { render, cleanup, fireEvent, screen, act, waitFor } from '@testing-library/react';
import MapComponent from '../MapComponent';
import L from 'leaflet';

describe('MapComponent', () => {
  let fakeMap: Partial<L.Map>;
  let mapSpy: ReturnType<typeof vi.spyOn>;
  let tileLayerSpy: ReturnType<typeof vi.spyOn>;
  let markerSpy: ReturnType<typeof vi.spyOn>;
  let fakeMarker: Partial<L.Marker>;

  beforeEach(() => {
    // create a chainable setView on fake map
    fakeMap = {
      setView: vi.fn().mockImplementation(function (this: any) { return this; }),
      removeLayer: vi.fn(),
    } as unknown as L.Map;

    // spy on L.map to return our fake map
    mapSpy = vi.spyOn(L, 'map').mockImplementation(() => fakeMap as unknown as L.Map)as unknown as ReturnType<typeof vi.spyOn>;

    // spy on tileLayer, return a fake tile layer with addTo
    tileLayerSpy = vi.spyOn(L, 'tileLayer').mockImplementation(() => ({
      addTo: vi.fn(),
      setUrl: vi.fn(),
      getTileUrl: vi.fn(),
    }) as unknown as L.TileLayer) as unknown as ReturnType<typeof vi.spyOn>;

    // build a fake marker with bindPopup and addTo
    fakeMarker = {
      bindPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn(),
    } as unknown as L.Marker;
    markerSpy = vi.spyOn(L, 'marker').mockImplementation(() => fakeMarker as unknown as L.Marker) as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders a .map container and all layer buttons', () => {
    const { container } = render(
      <MapComponent
        lat={0}
        lon={0}
        zoom={1}
        layer="temp_new"
        apiKey="KEY"
        onLayerChange={vi.fn()}
      />
    );

    // container should include div.map
    expect(container.querySelector('.map')).toBeInTheDocument();
    // check all buttons
    ['Temperature', 'Wind', 'Clouds', 'Precip'].forEach(label => {
      expect(
        screen.getByRole('button', { name: new RegExp(label, 'i') })
      ).toBeInTheDocument();
    });
  });

  it('initializes base-layer, marker popup, and overlay on mount', async () => {
    await act(async () => {
      render(
        <MapComponent
          lat={10}
          lon={20}
          zoom={5}
          layer="clouds_new"
          apiKey="MYKEY"
          onLayerChange={vi.fn()}
        />
      );
    });

    // setView called
    expect(fakeMap.setView).toHaveBeenCalledWith([10, 20], 5);

    // tileLayer called at least once
    await waitFor(() => {
      expect(tileLayerSpy).toHaveBeenCalled();
    });

    // verify base URL call
    expect(tileLayerSpy).toHaveBeenCalledWith(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({ attribution: '© OpenStreetMap', opacity: 0.8 })
    );

    // verify overlay URL call
    expect(tileLayerSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/clouds_new/{z}/{x}/{y}.png?appid=MYKEY'),
      expect.objectContaining({ attribution: '© OpenWeatherMap', opacity: 1 })
    );

    // marker and popup
    expect(markerSpy).toHaveBeenCalledWith([10, 20], expect.any(Object));
    expect(fakeMarker.bindPopup).toHaveBeenCalledWith('Your Location');
    expect(fakeMarker.addTo).toHaveBeenCalledWith(fakeMap);
  });

  it('calls setView again when props change', () => {
    const { rerender } = render(
      <MapComponent
        lat={0}
        lon={0}
        zoom={2}
        layer="temp_new"
        apiKey="KEY"
        onLayerChange={vi.fn()}
      />
    );
    expect(fakeMap.setView).toHaveBeenCalledWith([0, 0], 2);

    rerender(
      <MapComponent
        lat={8}
        lon={9}
        zoom={3}
        layer="temp_new"
        apiKey="KEY"
        onLayerChange={vi.fn()}
      />
    );
    expect(fakeMap.setView).toHaveBeenCalledWith([8, 9], 3);
  });

  it('fires onLayerChange with the correct layer key when buttons are clicked', () => {
    const onLayerChange = vi.fn();
    render(
      <MapComponent
        lat={0}
        lon={0}
        zoom={1}
        layer="a"
        apiKey="KEY"
        onLayerChange={onLayerChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /temperature/i }));
    expect(onLayerChange).toHaveBeenCalledWith('temp_new');

    fireEvent.click(screen.getByRole('button', { name: /wind/i }));
    expect(onLayerChange).toHaveBeenCalledWith('wind_new');

    fireEvent.click(screen.getByRole('button', { name: /clouds/i }));
    expect(onLayerChange).toHaveBeenCalledWith('clouds_new');

    fireEvent.click(screen.getByRole('button', { name: /precip/i }));
    expect(onLayerChange).toHaveBeenCalledWith('precipitation_new');
  });
});
