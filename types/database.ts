// types/database.ts

export type LocationStatus = 'active' | 'deleted';
export type RecordType = 'automatic' | 'manual';
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

export interface Record {
  id: string;
  user_id: string;
  location_id: string;
  location_name: string | null;
  entry_at: string;
  exit_at: string | null;
  type: RecordType;
  manually_edited: boolean;
  edit_reason: string | null;
  color: string | null;
  pause_minutes: number;
  created_at: string;
}

export interface ComputedSession extends Record {
  status: 'active' | 'finished';
  duration_minutes: number;
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
  return `${h}h ${m}min`;
}
