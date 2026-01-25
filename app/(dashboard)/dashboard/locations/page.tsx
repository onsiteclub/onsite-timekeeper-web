// app/(dashboard)/dashboard/locations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Location } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LocationMap } from '@/components/LocationMap';

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [newLocation, setNewLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lng: number, lat: number) => {
    setNewLocation({
      name: '',
      latitude: lat,
      longitude: lng,
    });
    setIsModalOpen(true);
  };

  const handleAddLocationClick = () => {
    // Get current position and open modal
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewLocation({
            name: '',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsModalOpen(true);
        },
        () => {
          // Default to center of map if geolocation fails
          setNewLocation({
            name: '',
            latitude: 38.9072,
            longitude: -77.0369,
          });
          setIsModalOpen(true);
        }
      );
    } else {
      setNewLocation({
        name: '',
        latitude: 38.9072,
        longitude: -77.0369,
      });
      setIsModalOpen(true);
    }
  };

  const handleSaveLocation = async (name: string, color: string) => {
    if (!newLocation) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('locations').insert({
        user_id: user.id,
        name,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        radius: 100,
        color: color,
        status: 'active',
      });

      if (error) throw error;

      await loadLocations();
      setIsModalOpen(false);
      setNewLocation(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save location');
    }
  };

  const handleEditLocation = async (location: Location, newName: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ name: newName, color: newColor, updated_at: new Date().toISOString() })
        .eq('id', location.id);

      if (error) throw error;

      await loadLocations();
      setEditingLocation(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update location');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('locations')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', locationId);

      if (error) throw error;

      await loadLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete location');
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto -m-4 md:m-0">
      {/* Search Bar */}
      <div className="p-4 bg-background sticky top-14 z-30">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Monitoring Toggle & Location Button */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isMonitoring
                ? 'bg-accent text-white'
                : 'bg-gray-200 text-text-secondary'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-white' : 'bg-gray-400'}`} />
            Monitoring
          </button>

          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setSelectedLocation({
                      id: 'current',
                      user_id: '',
                      name: 'Current Location',
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      radius: 100,
                      color: '#F5B800',
                      status: 'active',
                      created_at: '',
                      updated_at: '',
                    });
                  }
                );
              }
            }}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5B800" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="h-[300px] md:h-[400px] relative">
        <LocationMap
          locations={filteredLocations}
          onMapClick={handleMapClick}
          selectedLocation={selectedLocation}
        />

        {/* Add Location Button Overlay */}
        <button
          onClick={handleAddLocationClick}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary-light flex items-center justify-center shadow-lg"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5B800" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </button>
      </div>

      {/* Locations List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading...</div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <p className="text-text-muted text-sm">
              {searchQuery ? 'No locations found' : 'Tap the + button or click on the map to add a location'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="bg-white rounded-xl p-4 flex items-center justify-between"
                onClick={() => setSelectedLocation(location)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: location.color }}
                  />
                  <div>
                    <h3 className="font-medium text-text-primary">{location.name}</h3>
                    <p className="text-xs text-text-muted">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLocation(location);
                    }}
                    className="p-2 text-text-muted hover:text-text-primary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLocation(location.id);
                    }}
                    className="p-2 text-text-muted hover:text-error"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      <LocationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewLocation(null);
        }}
        onSave={handleSaveLocation}
        title="Add New Location"
      />

      {/* Edit Location Modal */}
      {editingLocation && (
        <LocationModal
          isOpen={true}
          onClose={() => setEditingLocation(null)}
          onSave={(name, color) => handleEditLocation(editingLocation, name, color)}
          title="Edit Location"
          initialName={editingLocation.name}
          initialColor={editingLocation.color}
        />
      )}
    </div>
  );
}

// Modal Component for Adding/Editing Locations
function LocationModal({
  isOpen,
  onClose,
  onSave,
  title,
  initialName = '',
  initialColor = '#EF4444',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  title: string;
  initialName?: string;
  initialColor?: string;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    setName(initialName);
    setColor(initialColor);
  }, [initialName, initialColor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), color);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Location Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jobsite Avalon"
          required
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Location</Button>
        </div>
      </form>
    </Modal>
  );
}
