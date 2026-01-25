// components/LocationMap.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Location } from '@/types/database';

interface LocationMapProps {
  locations: Location[];
  onMapClick?: (lng: number, lat: number) => void;
  selectedLocation?: Location | null;
}

export function LocationMap({ locations, onMapClick, selectedLocation }: LocationMapProps) {
  const [viewport, setViewport] = useState({
    longitude: -75.6972,
    latitude: 45.4215,
    zoom: 12,
  });

  // Update viewport when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setViewport({
        longitude: selectedLocation.longitude,
        latitude: selectedLocation.latitude,
        zoom: 14,
      });
    }
  }, [selectedLocation]);

  const handleMapClick = useCallback(
    (event: any) => {
      if (onMapClick && event.lngLat) {
        onMapClick(event.lngLat.lng, event.lngLat.lat);
      }
    },
    [onMapClick]
  );

  // Get Mapbox token from environment
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  if (!mapboxToken) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-text-muted">
          Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <Map
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        onClick={handleMapClick}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {locations.map((location) => (
          <Marker
            key={location.id}
            longitude={location.longitude}
            latitude={location.latitude}
            anchor="bottom"
          >
            <div
              className="w-8 h-8 rounded-full border-4 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform"
              style={{ backgroundColor: location.color }}
              title={location.name}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
