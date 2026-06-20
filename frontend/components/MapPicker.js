"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      if (onChange) {
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={customIcon} />
  );
}

export default function MapPicker({ position, onChange, defaultCenter = [-6.2088, 106.8456] }) {
  // If no position, center the map at defaultCenter (e.g. Jakarta)
  const center = position ? [position.lat, position.lng] : defaultCenter;

  return (
    <div className="w-full h-[300px] rounded-md overflow-hidden border border-surface-pressed relative z-0">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
