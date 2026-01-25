// app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration, formatDuration } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { formatDate, formatTime } from '@/lib/utils';

export default function DashboardPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    loadTodaySessions();
  }, []);

  const loadTodaySessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_at', today.toISOString())
        .lt('entry_at', tomorrow.toISOString())
        .order('entry_at', { ascending: false });

      if (error) throw error;

      const computed: ComputedSession[] = (data || []).map((record) => ({
        ...record,
        status: record.exit_at ? 'finished' : 'active',
        duration_minutes: calculateDuration(record.entry_at, record.exit_at),
      }));

      setSessions(computed);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalMinutes = sessions.reduce(
    (sum, session) => sum + session.duration_minutes - session.pause_minutes,
    0
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Today's Hours</h1>
          <p className="text-text-secondary">{formatDate(new Date())}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>+ Add Hours</Button>
      </div>

      {/* Summary Card */}
      <div className="bg-surface rounded-lg shadow p-6 mb-6">
        <div className="text-center">
          <p className="text-text-secondary text-sm mb-2">Total Hours Today</p>
          <p className="text-4xl font-bold text-primary">
            {formatDuration(totalMinutes)}
          </p>
          <p className="text-text-muted text-sm mt-2">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-surface rounded-lg shadow p-8 text-center">
            <p className="text-text-muted">No hours recorded for today</p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setIsFormOpen(true)}
            >
              Add your first entry
            </Button>
          </div>
        ) : (
          sessions.map((session) => {
            const netMinutes = session.duration_minutes - session.pause_minutes;
            return (
              <div
                key={session.id}
                className="bg-surface rounded-lg shadow p-4 border-l-4"
                style={{ borderLeftColor: session.color || '#4A90D9' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">
                      📍 {session.location_name || 'Unknown Location'}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-text-secondary">
                      <p>
                        {session.manually_edited && '*Edited '}
                        ➜ {formatTime(session.entry_at)} →{' '}
                        {session.exit_at ? formatTime(session.exit_at) : 'In Progress'}
                      </p>
                      {session.pause_minutes > 0 && (
                        <p>Break: {session.pause_minutes}min</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      {formatDuration(netMinutes)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {session.type === 'manual' ? 'Manual' : 'Automatic'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ManualEntryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadTodaySessions}
      />
    </div>
  );
}
