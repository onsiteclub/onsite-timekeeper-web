// components/WorkerHoursModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration, formatDuration } from '@/types/database';
import { generateMultiDayReport } from '@/lib/reports';
import { getArchivedEntryIds, archiveEntries, cleanupExpired } from '@/lib/archive-db';

interface WorkerHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
}

function getLocalName(workerId: string): string | null {
  try {
    return localStorage.getItem(`worker_name_${workerId}`);
  } catch {
    return null;
  }
}

function setLocalName(workerId: string, name: string) {
  try {
    localStorage.setItem(`worker_name_${workerId}`, name);
  } catch {}
}

export function WorkerHoursModal({
  isOpen,
  onClose,
  workerId,
  workerName,
}: WorkerHoursModalProps) {
  const [sessions, setSessions] = useState<ComputedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archivedCount, setArchivedCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);

  // Editable name
  const [displayName, setDisplayName] = useState(workerName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && workerId) {
      const local = getLocalName(workerId);
      setDisplayName(local || workerName);
      setSelectedIds(new Set());
      setShowArchived(false);
      loadWorkerHours();
    }
  }, [isOpen, workerId]);

  const loadWorkerHours = async () => {
    setLoading(true);
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabase
        .from('app_timekeeper_entries')
        .select('*')
        .eq('user_id', workerId)
        .is('deleted_at', null)
        .gte('entry_at', sixtyDaysAgo.toISOString())
        .order('entry_at', { ascending: true });

      if (error) throw error;

      const archivedIds = await getArchivedEntryIds(workerId);
      setArchivedCount(archivedIds.size);

      const allEntries = (data || []).map((record: any) => ({
        ...record,
        status: record.exit_at ? 'finished' : 'active',
        computed_duration_minutes: calculateDuration(record.entry_at, record.exit_at),
      })) as ComputedSession[];

      const pendingEntries = allEntries.filter((e) => !archivedIds.has(e.id));
      setSessions(pendingEntries);

      cleanupExpired().catch(() => {});
    } catch (err) {
      console.error('Error loading worker hours:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEntry = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + s.computed_duration_minutes - (s.pause_minutes || 0),
    0
  );

  const generateReport = (entries: ComputedSession[]) => {
    const dayKeys = new Set<string>();
    entries.forEach((s) => {
      const date = new Date(s.entry_at);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      dayKeys.add(`${yyyy}-${mm}-${dd}`);
    });

    return generateMultiDayReport({
      userName: displayName,
      userId: workerId,
      selectedDays: Array.from(dayKeys).sort(),
      sessions: entries,
    });
  };

  const handleShare = async () => {
    if (sessions.length === 0) return;
    const reportText = generateReport(sessions);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} - OnSite Timekeeper Report`,
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
    if (sessions.length === 0) return;
    const reportText = generateReport(sessions);

    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayName.replace(/\s+/g, '-')}-hours-${today}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsArchiving(true);
    try {
      await archiveEntries(workerId, Array.from(selectedIds));
      setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setArchivedCount((prev) => prev + selectedIds.size);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error archiving entries:', err);
      alert('Failed to archive entries');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveAll = async () => {
    if (sessions.length === 0) return;
    setIsArchiving(true);
    try {
      const entryIds = sessions.map((s) => s.id);
      await archiveEntries(workerId, entryIds);
      setArchivedCount((prev) => prev + sessions.length);
      setSessions([]);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error archiving entries:', err);
      alert('Failed to archive entries');
    } finally {
      setIsArchiving(false);
    }
  };

  const startEditName = () => {
    setEditNameValue(displayName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveName = () => {
    const trimmed = editNameValue.trim();
    if (trimmed) {
      setDisplayName(trimmed);
      setLocalName(workerId, trimmed);
    }
    setIsEditingName(false);
  };

  const formatEntryTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatEntryDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Header with name + total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">
                {displayName[0]?.toUpperCase() || 'W'}
              </span>
            </div>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="text-lg font-bold text-text-primary border-b-2 border-primary outline-none bg-transparent px-1"
              />
            ) : (
              <>
                <h2 className="text-lg font-bold text-text-primary">{displayName}</h2>
                <button onClick={startEditName} className="text-text-muted hover:text-text-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          {!loading && sessions.length > 0 && (
            <span className="text-primary font-bold text-lg">{formatDuration(totalMinutes)}</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-text-muted text-sm">Loading hours...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">No pending hours</p>
            <p className="text-text-muted text-sm mt-1">All hours have been archived</p>
          </div>
        ) : (
          <>
            {/* Pending Hours */}
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Pending Hours
              </p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sessions.map((session) => {
                  const isSelected = selectedIds.has(session.id);
                  const netMinutes = session.computed_duration_minutes - (session.pause_minutes || 0);
                  return (
                    <button
                      key={session.id}
                      onClick={() => toggleEntry(session.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${
                        isSelected ? 'bg-primary-light' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* Date */}
                      <span className="text-sm text-text-secondary w-14 flex-shrink-0">
                        {formatEntryDate(session.entry_at)}
                      </span>

                      {/* Time range */}
                      <span className="text-sm text-text-primary flex-1">
                        {formatEntryTime(session.entry_at)} - {session.exit_at ? formatEntryTime(session.exit_at) : 'In Progress'}
                      </span>

                      {/* Location */}
                      <span className="text-xs text-text-muted truncate max-w-[80px]">
                        {session.geofence_name || ''}
                      </span>

                      {/* Duration */}
                      <span className="text-sm font-medium text-text-primary flex-shrink-0">
                        {formatDuration(netMinutes)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Archive Buttons */}
            <div className="flex gap-2">
              <Button
                variant={selectedIds.size > 0 ? 'primary' : 'outline'}
                size="sm"
                onClick={handleArchiveSelected}
                disabled={selectedIds.size === 0 || isArchiving}
                className="flex-1"
              >
                {isArchiving && selectedIds.size > 0 ? 'Archiving...' : `Archive (${selectedIds.size})`}
              </Button>
              <Button
                variant={selectedIds.size > 0 ? 'outline' : 'primary'}
                size="sm"
                onClick={() => {
                  if (confirm(`Archive all ${sessions.length} entries?`)) {
                    handleArchiveAll();
                  }
                }}
                disabled={isArchiving}
                className="flex-1"
              >
                {isArchiving && selectedIds.size === 0 ? 'Archiving...' : 'Archive All'}
              </Button>
            </div>
          </>
        )}

        {/* Archived Section */}
        {archivedCount > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary w-full"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Archived ({archivedCount})
            </button>
            {showArchived && (
              <p className="text-xs text-text-muted mt-2 pl-5">
                {archivedCount} entries archived locally. Archives expire after 60 days.
              </p>
            )}
          </div>
        )}

        {/* Share / Export row */}
        {sessions.length > 0 && (
          <div className="border-t border-gray-100 pt-3 flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
