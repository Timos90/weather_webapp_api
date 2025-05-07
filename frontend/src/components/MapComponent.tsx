import React, { useEffect, useRef } from 'react';
import { MapComponentProps } from '../types/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../css/MapComponent.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

interface ExtendedMapComponentProps extends MapComponentProps {
  onLayerChange: (newLayer: string) => void;
}

const MapComponent: React.FC<ExtendedMapComponentProps> = ({ lat, lon, zoom, layer, apiKey, onLayerChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const overlayRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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
