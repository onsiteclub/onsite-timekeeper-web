// types/database.ts

export type LocationStatus = 'active' | 'deleted';
export type EntryMethod = 'automatic' | 'manual' | 'qr_code' | 'nfc';
export type GrantStatus = 'pending' | 'active' | 'revoked' | 'expired';

export interface Location {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
  status: LocationStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Matches the actual Supabase records table
export interface Record {
  id: string;
  user_id: string;
  geofence_id: string | null;
  geofence_name: string | null;
  project_id: string | null;
  entry_at: string;
  exit_at: string | null;
  pause_minutes: number | null;
  duration_minutes: number | null;
  entry_method: EntryMethod;
  exit_method: string | null;
  is_manual_entry: boolean | null;
  manually_edited: boolean | null;
  edit_reason: string | null;
  original_entry_at: string | null;
  original_exit_at: string | null;
  integrity_hash: string | null;
  notes: string | null;
  tags: string[] | null;
  device_id: string | null;
  client_created_at: string | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface ComputedSession extends Record {
  status: 'active' | 'finished';
  computed_duration_minutes: number;
}

export interface AccessGrant {
  id: string;
  owner_id: string;
  viewer_id: string;
  token: string;
  status: GrantStatus;
  label: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface PendingToken {
  id: string;
  owner_id: string;
  token: string;
  owner_name: string | null;
  expires_at: string;
  created_at: string;
}

// Helper functions
export function calculateDuration(start: string, end: string | null): number {
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.round((endTime - startTime) / 60000));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
