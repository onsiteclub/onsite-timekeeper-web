// app/(dashboard)/dashboard/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration, formatDuration } from '@/types/database';
import { generateMultiDayReport } from '@/lib/reports';
import { BackButton } from '@/components/BackButton';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Button } from '@/components/ui/Button';

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // User info for report generation
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  const supabase = createClient();
  const router = useRouter();

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

      setUserId(user.id);

      // Fetch user name from profile
      const { data: profile } = await supabase
        .from('core_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      }

      const range = viewMode === 'week' ? getWeekRange(currentDate) : getMonthRange(currentDate);

      const { data, error } = await supabase
        .from('app_timekeeper_entries')
        .select('*')
        .eq('user_id', user.id)
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

  // Get days for week view
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

  // Get calendar grid for month view
  const getCalendarGrid = () => {
    const range = getMonthRange(currentDate);
    const firstDay = range.start.getDay(); // 0 = Sunday
    const daysInMonth: Date[] = [];
    const d = new Date(range.start);
    while (d <= range.end) {
      daysInMonth.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return { firstDay, daysInMonth };
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

  // Format date to "YYYY-MM-DD" key
  const formatDateKey = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get sessions for selected days
  const getSelectedSessions = (): ComputedSession[] => {
    const result: ComputedSession[] = [];
    selectedDays.forEach((dateKey) => {
      const date = new Date(dateKey + 'T00:00:00');
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const daySessions = sessions.filter((s) => {
        const entryDate = new Date(s.entry_at);
        return entryDate >= dayStart && entryDate <= dayEnd;
      });
      result.push(...daySessions);
    });
    return result;
  };

  const handleDayClick = (date: Date) => {
    if (selectionMode) {
      const key = formatDateKey(date);
      if (isFutureDate(date)) return; // ignore future dates in selection mode
      setSelectedDays((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      return;
    }

    if (isFutureDate(date)) {
      alert('Cannot add entries for future dates');
      return;
    }
    router.push(`/dashboard?date=${formatDateKey(date)}`);
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedDays(new Set());
    } else {
      setSelectionMode(true);
    }
  };

  const handleSelectAll = () => {
    const days = viewMode === 'week' ? getWeekDays() : (getCalendarGrid().daysInMonth);
    const allPastDays = days.filter((d) => !isFutureDate(d));
    const allKeys = allPastDays.map(formatDateKey);

    if (selectedDays.size === allKeys.length) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set(allKeys));
    }
  };

  const handleShare = async () => {
    const selectedSessions = getSelectedSessions();
    if (selectedSessions.length === 0) {
      alert('No entries to share for the selected days');
      return;
    }

    const reportText = generateMultiDayReport({
      userName,
      userId,
      selectedDays: Array.from(selectedDays).sort(),
      sessions: selectedSessions,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OnSite Timekeeper Report',
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
    const selectedSessions = getSelectedSessions();
    if (selectedSessions.length === 0) {
      alert('No entries to export for the selected days');
      return;
    }

    const reportText = generateMultiDayReport({
      userName,
      userId,
      selectedDays: Array.from(selectedDays).sort(),
      sessions: selectedSessions,
    });

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateRange = Array.from(selectedDays).sort();
    a.href = url;
    a.download = `timekeeper-report-${dateRange[0]}-to-${dateRange[dateRange.length - 1]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const selectedSessions = getSelectedSessions();
      const entryIds = selectedSessions.map((s) => s.id);

      if (entryIds.length === 0) {
        alert('No entries to delete for the selected days');
        setShowDeleteConfirm(false);
        return;
      }

      const { error } = await supabase
        .from('app_timekeeper_entries')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', entryIds);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setSelectedDays(new Set());
      setSelectionMode(false);
      await loadSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entries');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (selectedDays.size !== 1) return;
    const dateKey = Array.from(selectedDays)[0];
    setSelectionMode(false);
    setSelectedDays(new Set());
    router.push(`/dashboard?date=${dateKey}`);
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.computed_duration_minutes - (s.pause_minutes || 0), 0);
  const weekDays = viewMode === 'week' ? getWeekDays() : [];
  const calendarGrid = viewMode === 'month' ? getCalendarGrid() : null;
  const maxMinutes = Math.max(...weekDays.map(getDayHours), 60);

  // Calculate selectable day count for "Select All" logic
  const selectableDays = viewMode === 'week'
    ? weekDays.filter((d) => !isFutureDate(d))
    : (calendarGrid?.daysInMonth || []).filter((d) => !isFutureDate(d));
  const allSelected = selectableDays.length > 0 && selectedDays.size === selectableDays.length;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode && (
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-primary"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <Button
            variant={selectionMode ? 'primary' : 'outline'}
            size="sm"
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Cancel' : 'Select'}
          </Button>
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

      {/* Week View - Day List */}
      {viewMode === 'week' && (
        <div className="space-y-2 mb-4">
          {weekDays.map((day) => {
            const minutes = getDayHours(day);
            const hasActive = hasActiveSession(day);
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = day.getDate();
            const today = isToday(day);
            const future = isFutureDate(day);
            const isSelected = selectedDays.has(formatDateKey(day));

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectionMode && isSelected
                    ? 'bg-primary-light border-2 border-primary'
                    : today
                      ? 'bg-primary-light border-2 border-primary'
                      : future
                        ? 'bg-gray-50 opacity-60'
                        : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : future
                          ? 'border-gray-200'
                          : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  )}
                  <span className="text-text-secondary text-sm w-8">{dayName}</span>
                  <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                    today && !selectionMode ? 'bg-primary text-white' : 'bg-gray-200 text-text-primary'
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
              </button>
            );
          })}
        </div>
      )}

      {/* Month View - Calendar Grid */}
      {viewMode === 'month' && calendarGrid && (
        <div className="bg-white rounded-2xl p-4 mb-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before the 1st */}
            {Array.from({ length: calendarGrid.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {calendarGrid.daysInMonth.map((day) => {
              const minutes = getDayHours(day);
              const hasActive = hasActiveSession(day);
              const today = isToday(day);
              const future = isFutureDate(day);
              const isSelected = selectedDays.has(formatDateKey(day));

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition-all ${
                    selectionMode && isSelected
                      ? 'bg-primary-light ring-2 ring-primary'
                      : today
                        ? 'bg-primary-light border-2 border-primary'
                        : future
                          ? 'bg-gray-50 opacity-50'
                          : minutes > 0
                            ? 'bg-gray-100 hover:bg-gray-200'
                            : 'hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`text-sm font-medium leading-none ${
                      selectionMode && isSelected
                        ? 'text-primary font-bold'
                        : today ? 'text-primary font-bold' : future ? 'text-text-muted' : 'text-text-primary'
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
                </button>
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

      {/* Spacer when action bar is visible */}
      {selectionMode && selectedDays.size > 0 && (
        <div className="h-32" />
      )}

      {/* Selection Action Bar */}
      {selectionMode && selectedDays.size > 0 && (
        <SelectionActionBar
          selectedCount={selectedDays.size}
          onShare={handleShare}
          onExport={handleExport}
          onDelete={() => setShowDeleteConfirm(true)}
          onEdit={handleEdit}
          onCancel={toggleSelectionMode}
          canEdit={selectedDays.size === 1}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        selectedDayCount={selectedDays.size}
        totalEntryCount={getSelectedSessions().length}
        isDeleting={isDeleting}
      />
    </div>
  );
}
