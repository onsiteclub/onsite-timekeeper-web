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

  const handleSaveLocation = async (name: string) => {
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
        color: '#4A90D9',
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

  const handleEditLocation = async (location: Location, newName: string) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ name: newName, updated_at: new Date().toISOString() })
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Locations</h1>
        <p className="text-text-secondary">
          Click on the map to add a new location
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <LocationMap
            locations={locations}
            onMapClick={handleMapClick}
            selectedLocation={selectedLocation}
          />
        </div>

        {/* Locations List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Your Locations ({locations.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-6 text-center">
              <p className="text-text-muted text-sm">
                No locations yet. Click on the map to add your first location.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="bg-surface rounded-lg shadow p-4 border-l-4 cursor-pointer hover:shadow-lg transition-shadow"
                  style={{ borderLeftColor: location.color }}
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary">
                        {location.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-1">
                        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLocation(location);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLocation(location.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
          onSave={(name) => handleEditLocation(editingLocation, name)}
          title="Edit Location"
          initialName={editingLocation.name}
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
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  title: string;
  initialName?: string;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
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
