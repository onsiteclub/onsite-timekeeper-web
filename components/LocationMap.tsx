// components/LocationMap.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { TimekeeperGeofence } from '@/types/database';

interface LocationMapProps {
  locations: TimekeeperGeofence[];
  onMapClick?: (lng: number, lat: number) => void;
  selectedLocation?: TimekeeperGeofence | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: -23.5505, // São Paulo
  lng: -46.6333,
};

export function LocationMap({ locations, onMapClick, selectedLocation }: LocationMapProps) {
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(12);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  // Update center when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setCenter({
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      });
      setZoom(16);
    }
  }, [selectedLocation]);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (onMapClick && event.latLng) {
        onMapClick(event.latLng.lng(), event.latLng.lat());
      }
    },
    [onMapClick]
  );

  if (loadError) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-red-500">Erro ao carregar Google Maps</p>
      </div>
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-text-muted">
          Google Maps API key não configurada. Adicione NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ao .env.local
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onClick={handleMapClick}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {locations.map((location) => (
          <div key={location.id}>
            <Marker
              position={{
                lat: location.latitude,
                lng: location.longitude,
              }}
              title={location.name}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: location.color || '#F5B800',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
              }}
            />
            {location.radius && (
              <Circle
                center={{
                  lat: location.latitude,
                  lng: location.longitude,
                }}
                radius={location.radius}
                options={{
                  fillColor: location.color || '#F5B800',
                  fillOpacity: 0.15,
                  strokeColor: location.color || '#F5B800',
                  strokeOpacity: 0.5,
                  strokeWeight: 2,
                }}
              />
            )}
          </div>
        ))}
      </GoogleMap>
    </div>
  );
}
