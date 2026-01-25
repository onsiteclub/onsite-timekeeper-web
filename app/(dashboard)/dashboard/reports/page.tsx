// app/(dashboard)/dashboard/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration, formatDuration } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { ReportGenerator } from '@/components/ReportGenerator';
import { getDaysInMonth, isSameDay } from '@/lib/utils';

export default function ReportsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [daySessions, setDaySessions] = useState<ComputedSession[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadUserInfo();
    loadMonthSessions();
  }, [currentDate]);

  const loadUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setUserName(profile?.full_name || user.email?.split('@')[0] || 'User');
    }
  };

  const loadMonthSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_at', startDate.toISOString())
        .lte('entry_at', endDate.toISOString())
        .order('entry_at', { ascending: true });

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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const filtered = sessions.filter((s) => isSameDay(s.entry_at, date));
    setDaySessions(filtered);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const daysInMonth = getDaysInMonth(
    currentDate.getFullYear(),
    currentDate.getMonth()
  );

  // Group sessions by date
  const sessionsByDate = new Map<string, ComputedSession[]>();
  sessions.forEach((session) => {
    const dateKey = new Date(session.entry_at).toDateString();
    if (!sessionsByDate.has(dateKey)) {
      sessionsByDate.set(dateKey, []);
    }
    sessionsByDate.get(dateKey)!.push(session);
  });

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-secondary">View and export your work hours</p>
      </div>

      {/* Calendar */}
      <div className="bg-surface rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" onClick={handlePrevMonth}>
            ← Previous
          </Button>
          <h2 className="text-xl font-semibold text-text-primary">{monthName}</h2>
          <Button variant="ghost" onClick={handleNextMonth}>
            Next →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-text-muted py-2"
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Days */}
          {daysInMonth.map((date) => {
            const dateKey = date.toDateString();
            const daySessions = sessionsByDate.get(dateKey) || [];
            const totalMinutes = daySessions.reduce(
              (sum, s) => sum + s.duration_minutes - s.pause_minutes,
              0
            );
            const hasHours = daySessions.length > 0;
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                className={`
                  p-2 rounded-lg text-center transition-colors
                  ${isToday ? 'ring-2 ring-primary' : ''}
                  ${isSelected ? 'bg-primary text-white' : ''}
                  ${!isSelected && hasHours ? 'bg-blue-50 hover:bg-blue-100' : ''}
                  ${!isSelected && !hasHours ? 'hover:bg-gray-100' : ''}
                `}
              >
                <div className="text-sm font-medium">{date.getDate()}</div>
                {hasHours && (
                  <div
                    className={`text-xs mt-1 ${
                      isSelected ? 'text-white' : 'text-primary'
                    }`}
                  >
                    {formatDuration(totalMinutes)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Detail */}
      {selectedDate && (
        <div className="bg-surface rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-text-primary">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            {daySessions.length > 0 && (
              <Button onClick={() => setIsReportOpen(true)}>
                📄 Generate Report
              </Button>
            )}
          </div>

          {daySessions.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              No hours recorded for this day
            </p>
          ) : (
            <div className="space-y-3">
              {daySessions.map((session) => {
                const netMinutes = session.duration_minutes - session.pause_minutes;
                const entryTime = new Date(session.entry_at).toLocaleTimeString(
                  'en-US',
                  {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }
                );
                const exitTime = session.exit_at
                  ? new Date(session.exit_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'In Progress';

                return (
                  <div
                    key={session.id}
                    className="border-l-4 pl-4 py-2"
                    style={{ borderLeftColor: session.color || '#4A90D9' }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          📍 {session.location_name || 'Unknown Location'}
                        </h3>
                        <p className="text-sm text-text-secondary mt-1">
                          {session.manually_edited && '*Edited '}
                          ➜ {entryTime} → {exitTime}
                        </p>
                        {session.pause_minutes > 0 && (
                          <p className="text-sm text-text-secondary">
                            Break: {session.pause_minutes}min
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        {formatDuration(netMinutes)}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">
                    Total Hours:
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatDuration(
                      daySessions.reduce(
                        (sum, s) => sum + s.duration_minutes - s.pause_minutes,
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Generator Modal */}
      {selectedDate && (
        <ReportGenerator
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          date={selectedDate}
          sessions={daySessions}
          userName={userName}
          userId={userId}
        />
      )}
    </div>
  );
}
