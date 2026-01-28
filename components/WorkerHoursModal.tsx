// components/WorkerHoursModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { createClient } from '@/lib/supabase/client';
import { ComputedSession, calculateDuration } from '@/types/database';
import { generateMultiDayReport } from '@/lib/reports';
import { getArchivedEntryIds, archiveEntries, cleanupExpired } from '@/lib/archive-db';

interface WorkerHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
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
  const [reportText, setReportText] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && workerId) {
      loadWorkerHours();
    }
  }, [isOpen, workerId]);

  const loadWorkerHours = async () => {
    setLoading(true);
    try {
      // Fetch last 60 days of entries
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

      // Get archived IDs from IndexedDB
      const archivedIds = await getArchivedEntryIds(workerId);

      // Filter out archived entries
      const allEntries = (data || []).map((record: any) => ({
        ...record,
        status: record.exit_at ? 'finished' : 'active',
        computed_duration_minutes: calculateDuration(record.entry_at, record.exit_at),
      })) as ComputedSession[];

      const pendingEntries = allEntries.filter((e) => !archivedIds.has(e.id));
      setSessions(pendingEntries);

      // Generate report text
      if (pendingEntries.length > 0) {
        const dayKeys = new Set<string>();
        pendingEntries.forEach((s) => {
          const date = new Date(s.entry_at);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          dayKeys.add(`${yyyy}-${mm}-${dd}`);
        });

        const text = generateMultiDayReport({
          userName: workerName,
          userId: workerId,
          selectedDays: Array.from(dayKeys).sort(),
          sessions: pendingEntries,
        });
        setReportText(text);
      } else {
        setReportText('');
      }

      // Cleanup expired archives in the background
      cleanupExpired().catch(() => {});
    } catch (err) {
      console.error('Error loading worker hours:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!reportText) return;

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
    if (!reportText) return;

    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workerName.replace(/\s+/g, '-')}-hours-${today}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleArchive = async () => {
    if (sessions.length === 0) return;

    setIsArchiving(true);
    try {
      const entryIds = sessions.map((s) => s.id);
      await archiveEntries(workerId, entryIds);
      setSessions([]);
      setReportText('');
      onClose();
    } catch (err) {
      console.error('Error archiving entries:', err);
      alert('Failed to archive entries');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${workerName} - Hours`} size="lg">
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-text-muted text-sm">Loading hours...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
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
            {/* Report Text */}
            <pre className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-xl text-sm font-mono text-text-primary whitespace-pre-wrap">
              {reportText}
            </pre>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
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
              <div className="flex-1" />
              <Button
                variant="primary"
                size="sm"
                onClick={handleArchive}
                disabled={isArchiving}
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
