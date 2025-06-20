import React, { useEffect, useRef } from 'react';
import { MapComponentProps } from '../types/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../css/MapComponent.css';

/**
 * Default Leaflet icon configuration for map markers.
 * Uses standard marker images from unpkg CDN.
 */
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

/**
 * Props for the MapComponent, extending the base MapComponentProps (from types.ts)
 * with an additional callback for layer changes.
 */
interface ExtendedMapComponentProps extends MapComponentProps {
  /** Callback function triggered when a user selects a new weather overlay layer. Passes the new layer key (e.g., 'temp_new'). */
  onLayerChange: (newLayer: string) => void;
}

/**
 * Renders an interactive map using Leaflet.
 * Displays a base OpenStreetMap layer, a selectable weather overlay from OpenWeatherMap
 * (temperature, wind, clouds, precipitation), and a marker at the specified latitude and longitude.
 *
 * @param {ExtendedMapComponentProps} props - The props for the component.
 * @returns {React.ReactElement} The map component with layer selection buttons.
 */
const MapComponent: React.FC<ExtendedMapComponentProps> = ({ lat, lon, zoom, layer, apiKey, onLayerChange }) => {
  /** Ref for the div element that will contain the Leaflet map. */
  const mapRef = useRef<HTMLDivElement>(null);
  /** Ref for the Leaflet map instance. */
  const leafletMapRef = useRef<L.Map | null>(null);
  /** Ref for the base OpenStreetMap tile layer. */
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  /** Ref for the current OpenWeatherMap overlay layer. */
  const overlayRef = useRef<L.TileLayer | null>(null);
  /** Ref for the marker indicating the current location. */
  const markerRef = useRef<L.Marker | null>(null);

  /**
   * useEffect hook to initialize and update the Leaflet map.
   * - Initializes the map instance on component mount if it doesn't exist, setting the initial view and base layer.
   * - Updates the map's view (center and zoom) when `lat`, `lon`, or `zoom` props change.
   * - Updates the marker position when `lat` or `lon` props change.
   * - Removes the old weather overlay and adds the new one when `layer` or `apiKey` props change.
   *   The `apiKey` is included as a dependency because the overlay URL depends on it.
   */
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView([lat, lon], zoom);
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lon], zoom);
      if (!baseLayerRef.current) {
        baseLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          opacity: 0.8,
        });
        baseLayerRef.current.addTo(leafletMapRef.current);
      }
      if (markerRef.current) {
        leafletMapRef.current.removeLayer(markerRef.current);
      }
      markerRef.current = L.marker([lat, lon], { icon: defaultIcon }).bindPopup('Your Location');
      markerRef.current.addTo(leafletMapRef.current);
      if (overlayRef.current) {
        leafletMapRef.current.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      const owmUrl = `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`;
      overlayRef.current = L.tileLayer(owmUrl, { attribution: '© OpenWeatherMap', opacity: 1 });
      overlayRef.current.addTo(leafletMapRef.current);
    }
  }, [lat, lon, zoom, layer, apiKey]);

  return (
    <div className="map-display">
      <div className="layer-buttons">
        <button onClick={() => onLayerChange('temp_new')}>Temperature</button>
        <button onClick={() => onLayerChange('wind_new')}>Wind</button>
        <button onClick={() => onLayerChange('clouds_new')}>Clouds</button>
        <button onClick={() => onLayerChange('precipitation_new')}>Precip</button>
      </div>
      <div className="map" ref={mapRef} />
    </div>
  );
};

export default MapComponent;
