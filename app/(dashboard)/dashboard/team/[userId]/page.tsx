// app/(dashboard)/dashboard/team/[userId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration, formatDuration } from '@/types/database';
import { generateMultiDayReport } from '@/lib/reports';
import { BackButton } from '@/components/BackButton';

export default function WorkerHoursPage() {
  const params = useParams();
  const workerId = params.userId as string;

  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerName, setWorkerName] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkAccessAndLoad();
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

  const checkAccessAndLoad = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verify active access grant exists
      const { data: grant } = await supabase
        .from('access_grants')
        .select('id')
        .eq('owner_id', workerId)
        .eq('viewer_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!grant) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      // Fetch worker name
      const { data: profile } = await supabase
        .from('core_profiles')
        .select('full_name')
        .eq('id', workerId)
        .single();

      if (profile?.full_name) {
        setWorkerName(profile.full_name);
      }

      // Fetch worker entries
      const range = viewMode === 'week' ? getWeekRange(currentDate) : getMonthRange(currentDate);

      const { data, error } = await supabase
        .from('app_timekeeper_entries')
        .select('*')
        .eq('user_id', workerId)
        .is('deleted_at', null)
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
      console.error('Error loading worker hours:', err);
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

  const getWeekDays = () => {
    const range = getWeekRange(currentDate);
    const days = [];
    const d = new Date(range.start);
    while (d <= range.end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const getCalendarGrid = () => {
    const range = getMonthRange(currentDate);
    const firstDay = range.start.getDay();
    const daysInMonth: Date[] = [];
    const d = new Date(range.start);
    while (d <= range.end) {
      daysInMonth.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return { firstDay, daysInMonth };
  };

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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check > today;
  };

  const formatDateKey = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get all days with sessions in current range for Share/Export
  const getVisibleDaysWithSessions = (): string[] => {
    const dayKeys = new Set<string>();
    sessions.forEach((s) => {
      const date = new Date(s.entry_at);
      dayKeys.add(formatDateKey(date));
    });
    return Array.from(dayKeys).sort();
  };

  const handleShare = async () => {
    if (sessions.length === 0) {
      alert('No entries to share for this period');
      return;
    }

    const reportText = generateMultiDayReport({
      userName: workerName,
      userId: workerId,
      selectedDays: getVisibleDaysWithSessions(),
      sessions,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${workerName} - OnSite Timekeeper Report`,
          text: reportText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(reportText);
          alert('Report copied to clipboard');
        }
      }
    } else {
      await navigator.clipboard.writeText(reportText);
      alert('Report copied to clipboard');
    }
  };

  const handleExport = () => {
    if (sessions.length === 0) {
      alert('No entries to export for this period');
      return;
    }

    const selectedDays = getVisibleDaysWithSessions();
    const reportText = generateMultiDayReport({
      userName: workerName,
      userId: workerId,
      selectedDays,
      sessions,
    });

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workerName.replace(/\s+/g, '-')}-report-${selectedDays[0]}-to-${selectedDays[selectedDays.length - 1]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.computed_duration_minutes - (s.pause_minutes || 0), 0);
  const weekDays = viewMode === 'week' ? getWeekDays() : [];
  const calendarGrid = viewMode === 'month' ? getCalendarGrid() : null;
  const maxMinutes = Math.max(...weekDays.map(getDayHours), 60);

  if (accessDenied) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallbackHref="/dashboard/team" />
          <h1 className="text-2xl font-bold text-text-primary">Access Denied</h1>
        </div>
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Access</h3>
          <p className="text-text-muted text-sm max-w-xs mx-auto">
            You don&apos;t have an active access grant to view this worker&apos;s hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/dashboard/team" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {workerName || 'Worker'}
            </h1>
            <p className="text-text-secondary text-sm">Work Hours</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Share */}
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
            title="Share"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          {/* Export */}
          <button
            onClick={handleExport}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
            title="Export"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

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

      {/* Week View - Day List (read-only) */}
      {viewMode === 'week' && (
        <div className="space-y-2 mb-4">
          {weekDays.map((day) => {
            const minutes = getDayHours(day);
            const hasActive = hasActiveSession(day);
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = day.getDate();
            const today = isToday(day);
            const future = isFutureDate(day);

            return (
              <div
                key={day.toISOString()}
                className={`w-full flex items-center justify-between p-3 rounded-xl ${
                  today
                    ? 'bg-primary-light border-2 border-primary'
                    : future
                      ? 'bg-gray-50 opacity-60'
                      : 'bg-gray-100'
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
                  <span className={`text-sm font-bold ${minutes > 0 ? 'text-text-primary' : 'text-text-muted'}`}>
                    {minutes > 0 ? formatDuration(minutes) : '---'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View - Calendar Grid (read-only) */}
      {viewMode === 'month' && calendarGrid && (
        <div className="bg-white rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calendarGrid.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {calendarGrid.daysInMonth.map((day) => {
              const minutes = getDayHours(day);
              const hasActive = hasActiveSession(day);
              const today = isToday(day);
              const future = isFutureDate(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 ${
                    today
                      ? 'bg-primary-light border-2 border-primary'
                      : future
                        ? 'bg-gray-50 opacity-50'
                        : minutes > 0
                          ? 'bg-gray-100'
                          : ''
                  }`}
                >
                  <span
                    className={`text-sm font-medium leading-none ${
                      today ? 'text-primary font-bold' : future ? 'text-text-muted' : 'text-text-primary'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {minutes > 0 ? (
                    <span className="text-[10px] text-text-secondary font-medium mt-0.5 leading-none">
                      {formatDuration(minutes)}
                    </span>
                  ) : hasActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

              let barColor = 'bg-gray-200';
              if (minutes > 0) {
                if (minutes >= 480) {
                  barColor = 'bg-green-800';
                } else if (minutes >= 360) {
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
