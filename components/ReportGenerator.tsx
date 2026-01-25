// components/ReportGenerator.tsx
'use client';

import { useState } from 'react';
import { ComputedSession } from '@/types/database';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { generateReport } from '@/lib/reports';

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  sessions: ComputedSession[];
  userName: string;
  userId: string;
}

export function ReportGenerator({
  isOpen,
  onClose,
  date,
  sessions,
  userName,
  userId,
}: ReportGeneratorProps) {
  const [copied, setCopied] = useState(false);

  const reportText = generateReport({
    userName,
    date,
    sessions,
    userId,
    regionCode: 'QC', // TODO: Get from user profile or GPS
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timekeeper-report-${date.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Report" size="lg">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
          {reportText}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleDownload}>
            📥 Download
          </Button>
          <Button onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
