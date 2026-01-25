// components/ManualEntryForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Location } from '@/types/database';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';

interface ManualEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualEntryForm({ isOpen, onClose, onSuccess }: ManualEntryFormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryTime, setEntryTime] = useState('08:00');
  const [exitTime, setExitTime] = useState('17:00');
  const [pauseMinutes, setPauseMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadLocations();
    }
  }, [isOpen]);

  const loadLocations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('name');

    if (data) {
      setLocations(data);
      if (data.length > 0 && !selectedLocation) {
        setSelectedLocation(data[0].id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const location = locations.find((l) => l.id === selectedLocation);
      if (!location) throw new Error('Location not found');

      // Combine date and time
      const entryAt = new Date(`${date}T${entryTime}:00`);
      const exitAt = new Date(`${date}T${exitTime}:00`);

      // Validate
      if (exitAt <= entryAt) {
        throw new Error('Exit time must be after entry time');
      }

      const { error: insertError } = await supabase.from('records').insert({
        user_id: user.id,
        location_id: location.id,
        location_name: location.name,
        entry_at: entryAt.toISOString(),
        exit_at: exitAt.toISOString(),
        type: 'manual',
        manually_edited: true,
        edit_reason: 'Web portal entry',
        pause_minutes: pauseMinutes,
        color: location.color,
      });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setEntryTime('08:00');
      setExitTime('17:00');
      setPauseMinutes(30);
    } catch (err: any) {
      setError(err.message || 'Failed to save hours');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Hours Manually">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Location
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Entry Time"
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            required
          />

          <Input
            label="Exit Time"
            type="time"
            value={exitTime}
            onChange={(e) => setExitTime(e.target.value)}
            required
          />
        </div>

        <Input
          label="Break (minutes)"
          type="number"
          min="0"
          value={pauseMinutes}
          onChange={(e) => setPauseMinutes(parseInt(e.target.value) || 0)}
        />

        {error && (
          <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Hours'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
