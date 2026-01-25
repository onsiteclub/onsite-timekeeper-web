// app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Location, ComputedSession, calculateDuration, formatDuration } from '@/types/database';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryHour, setEntryHour] = useState('09');
  const [entryMinute, setEntryMinute] = useState('00');
  const [entryAmPm, setEntryAmPm] = useState<'AM' | 'PM'>('AM');
  const [exitHour, setExitHour] = useState('05');
  const [exitMinute, setExitMinute] = useState('00');
  const [exitAmPm, setExitAmPm] = useState<'AM' | 'PM'>('PM');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    getCurrentPosition();
  }, []);

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoError(null);
      },
      (error) => {
        setGeoError('Unable to get location');
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true }
    );
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load locations (geofences)
      const { data: locData } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Map geofences to Location format
      const mappedLocations: Location[] = (locData || []).map((g: any) => ({
        id: g.id,
        user_id: g.user_id,
        name: g.name,
        latitude: g.latitude,
        longitude: g.longitude,
        radius: g.radius || 100,
        color: g.color || '#EF4444',
        status: g.status || 'active',
        deleted_at: g.deleted_at,
        created_at: g.created_at,
        updated_at: g.updated_at,
      }));

      setLocations(mappedLocations);
      if (mappedLocations.length > 0) {
        setSelectedLocation(mappedLocations[0]);
      }

      // Load today's sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: sessData } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_at', today.toISOString())
        .lt('entry_at', tomorrow.toISOString())
        .is('deleted_at', null)
        .order('entry_at', { ascending: false });

      const computed: ComputedSession[] = (sessData || []).map((record: any) => ({
        ...record,
        status: record.exit_at ? 'finished' : 'active',
        computed_duration_minutes: calculateDuration(record.entry_at, record.exit_at),
      }));

      setSessions(computed);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertTo24Hour = (hour: string, amPm: 'AM' | 'PM') => {
    let h = parseInt(hour);
    if (amPm === 'PM' && h !== 12) h += 12;
    if (amPm === 'AM' && h === 12) h = 0;
    return h;
  };

  const calculateTotal = () => {
    const entryH = convertTo24Hour(entryHour, entryAmPm);
    const exitH = convertTo24Hour(exitHour, exitAmPm);
    const entryMins = entryH * 60 + parseInt(entryMinute);
    const exitMins = exitH * 60 + parseInt(exitMinute);
    let total = exitMins - entryMins - breakMinutes;
    if (total < 0) total += 24 * 60; // Handle overnight
    return total;
  };

  const handleSaveHours = async () => {
    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const entryDate = new Date(selectedDate);
      entryDate.setHours(convertTo24Hour(entryHour, entryAmPm), parseInt(entryMinute), 0, 0);

      const exitDate = new Date(selectedDate);
      exitDate.setHours(convertTo24Hour(exitHour, exitAmPm), parseInt(exitMinute), 0, 0);

      // Handle overnight shifts
      if (exitDate <= entryDate) {
        exitDate.setDate(exitDate.getDate() + 1);
      }

      const durationMins = Math.round((exitDate.getTime() - entryDate.getTime()) / 60000) - breakMinutes;

      const { error } = await supabase.from('records').insert({
        user_id: user.id,
        geofence_id: selectedLocation.id,
        geofence_name: selectedLocation.name,
        entry_at: entryDate.toISOString(),
        exit_at: exitDate.toISOString(),
        pause_minutes: breakMinutes,
        duration_minutes: durationMins,
        entry_method: 'manual',
        exit_method: 'manual',
        is_manual_entry: true,
        manually_edited: false,
      });

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = calculateTotal();
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getLocationTime = (locationId: string) => {
    const locationSessions = sessions.filter(s => s.geofence_id === locationId);
    const total = locationSessions.reduce((sum, s) => sum + s.computed_duration_minutes - (s.pause_minutes || 0), 0);
    return formatDuration(total);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Location Cards */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelectedLocation(loc)}
            className={`flex-shrink-0 w-32 p-3 rounded-xl transition-all ${
              selectedLocation?.id === loc.id
                ? 'bg-primary-light border-2 border-primary'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: loc.color || '#EF4444' }}
              />
              <span className="text-sm font-medium text-text-primary truncate">
                {loc.name}
              </span>
            </div>
            <p className="text-xs text-text-muted">{getLocationTime(loc.id)}</p>
          </button>
        ))}
        <button
          onClick={() => window.location.href = '/dashboard/locations'}
          className="flex-shrink-0 w-32 p-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center"
        >
          <span className="text-2xl text-gray-400">+</span>
        </button>
      </div>

      {/* Manual Entry Form */}
      <div className="bg-primary-light rounded-2xl p-4 mb-4">
        <div className="bg-white rounded-xl p-4 space-y-4">
          {/* Date Picker */}
          <button
            className="w-full flex items-center gap-2 text-left"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'date';
              input.value = selectedDate.toISOString().split('T')[0];
              input.onchange = (e) => setSelectedDate(new Date((e.target as HTMLInputElement).value));
              input.click();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-text-primary font-medium">{formatDateDisplay(selectedDate)}</span>
            <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Entry Time */}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Entry</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={entryHour}
                onChange={(e) => setEntryHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-12 h-10 text-center text-lg font-medium bg-gray-100 rounded-lg"
                maxLength={2}
              />
              <span className="text-xl text-text-muted">:</span>
              <input
                type="text"
                value={entryMinute}
                onChange={(e) => setEntryMinute(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-12 h-10 text-center text-lg font-medium bg-gray-100 rounded-lg"
                maxLength={2}
              />
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => setEntryAmPm('AM')}
                  className={`px-3 py-2 text-sm font-medium ${
                    entryAmPm === 'AM' ? 'bg-primary text-white' : 'bg-white text-text-secondary'
                  }`}
                >
                  AM
                </button>
                <button
                  onClick={() => setEntryAmPm('PM')}
                  className={`px-3 py-2 text-sm font-medium ${
                    entryAmPm === 'PM' ? 'bg-primary text-white' : 'bg-white text-text-secondary'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Exit Time */}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Exit</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={exitHour}
                onChange={(e) => setExitHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-12 h-10 text-center text-lg font-medium bg-gray-100 rounded-lg"
                maxLength={2}
              />
              <span className="text-xl text-text-muted">:</span>
              <input
                type="text"
                value={exitMinute}
                onChange={(e) => setExitMinute(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-12 h-10 text-center text-lg font-medium bg-gray-100 rounded-lg"
                maxLength={2}
              />
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => setExitAmPm('AM')}
                  className={`px-3 py-2 text-sm font-medium ${
                    exitAmPm === 'AM' ? 'bg-primary text-white' : 'bg-white text-text-secondary'
                  }`}
                >
                  AM
                </button>
                <button
                  onClick={() => setExitAmPm('PM')}
                  className={`px-3 py-2 text-sm font-medium ${
                    exitAmPm === 'PM' ? 'bg-primary text-white' : 'bg-white text-text-secondary'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Break */}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Break</span>
            <select
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-100 rounded-lg text-text-primary font-medium"
            >
              <option value={0}>None</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
            </select>
          </div>

          {/* Total */}
          <div className="text-center py-2">
            <span className="text-text-secondary">Total: </span>
            <span className="font-bold text-text-primary">{hours}h{mins > 0 ? ` ${mins}min` : ''}</span>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveHours}
            disabled={saving || !selectedLocation}
            className="w-full py-3 text-base font-semibold"
          >
            {saving ? 'Saving...' : '✓ Save Hours'}
          </Button>
        </div>
      </div>

      {/* Location Status */}
      <div className="bg-white rounded-2xl p-8 text-center">
        {currentPosition ? (
          <div>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">Location detected</p>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <p className="text-text-muted text-sm">
              {geoError || 'Waiting for location...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
