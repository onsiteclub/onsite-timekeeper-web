// app/(dashboard)/dashboard/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration, formatDuration } from '@/types/database';

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadSessions();
  }, [currentDate, viewMode]);

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const range = viewMode === 'week' ? getWeekRange(currentDate) : getMonthRange(currentDate);

      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_at', range.start.toISOString())
        .lte('entry_at', range.end.toISOString())
        .order('entry_at', { ascending: true });

      if (error) throw error;

      const computed: ComputedSession[] = (data || []).map((record: any) => ({
        ...record,
        status: record.exit_at ? 'finished' : 'active',
        computed_duration_minutes: calculateDuration(record.entry_at, record.exit_at),
      }));

      setSessions(computed);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  // Get date range string
  const getDateRangeString = () => {
    if (viewMode === 'week') {
      const range = getWeekRange(currentDate);
      const startStr = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  // Get days for display
  const getDays = () => {
    if (viewMode === 'week') {
      const range = getWeekRange(currentDate);
      const days = [];
      const d = new Date(range.start);
      while (d <= range.end) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      return days;
    } else {
      const range = getMonthRange(currentDate);
      const days = [];
      const d = new Date(range.start);
      while (d <= range.end) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      return days;
    }
  };

  // Calculate hours for a specific day
  const getDayHours = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySessions = sessions.filter((s) => {
      const entryDate = new Date(s.entry_at);
      return entryDate >= dayStart && entryDate <= dayEnd;
    });

    return daySessions.reduce((sum, s) => sum + s.computed_duration_minutes - (s.pause_minutes || 0), 0);
  };

  // Check if a session is active (no exit time)
  const hasActiveSession = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return sessions.some((s) => {
      const entryDate = new Date(s.entry_at);
      return entryDate >= dayStart && entryDate <= dayEnd && !s.exit_at;
    });
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.computed_duration_minutes - (s.pause_minutes || 0), 0);
  const days = getDays();
  const weekDays = viewMode === 'week' ? days : days.slice(0, 7);
  const maxMinutes = Math.max(...weekDays.map(getDayHours), 60); // Minimum 60 minutes for scale

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary mb-4">Reports</h1>

      {/* Date Navigation Card */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrev}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-sm text-text-secondary">{getDateRangeString()}</p>
            <p className="text-2xl font-bold text-text-primary">{formatDuration(totalMinutes)}</p>
          </div>

          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'week'
                ? 'bg-text-primary text-white'
                : 'text-text-secondary'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-text-primary text-white'
                : 'text-text-secondary'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="space-y-2 mb-4">
        {days.map((day) => {
          const minutes = getDayHours(day);
          const hasActive = hasActiveSession(day);
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = day.getDate();
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`flex items-center justify-between p-3 rounded-xl ${
                today ? 'bg-primary-light border-2 border-primary' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-text-secondary text-sm w-8">{dayName}</span>
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                  today ? 'bg-primary text-white' : 'bg-gray-200 text-text-primary'
                }`}>
                  {dayNum}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasActive && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
                <span className={`text-sm font-medium ${minutes > 0 ? 'text-text-primary' : 'text-text-muted'}`}>
                  {minutes > 0 ? formatDuration(minutes) : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Chart */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Weekly Hours</h3>
          <p className="text-xs text-text-muted mb-4">
            {getDateRangeString().split(' - ')[0]}
          </p>

          <div className="flex items-end justify-between h-32 gap-2 mb-2">
            {weekDays.map((day) => {
              const minutes = getDayHours(day);
              const height = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
              const dayName = day.toLocaleDateString('en-US', { weekday: 'narrow' });
              const today = isToday(day);

              // Determine bar color based on minutes
              let barColor = 'bg-gray-200';
              if (minutes > 0) {
                if (minutes >= 480) { // 8+ hours
                  barColor = 'bg-green-800';
                } else if (minutes >= 360) { // 6+ hours
                  barColor = 'bg-primary';
                } else {
                  barColor = 'bg-primary-light';
                }
              }

              return (
                <div key={day.toISOString()} className="flex-1 flex flex-col items-center">
                  {minutes > 0 && (
                    <span className="text-xs text-text-muted mb-1">
                      {formatDuration(minutes)}
                    </span>
                  )}
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg ${barColor} transition-all`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={`text-xs mt-2 ${today ? 'font-bold text-primary' : 'text-text-muted'}`}>
                    {dayName}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2 border-t border-gray-100">
            <span className="text-sm text-text-muted">{formatDuration(totalMinutes)} total</span>
          </div>
        </div>
      )}
    </div>
  );
}
