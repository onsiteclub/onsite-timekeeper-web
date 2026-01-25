// lib/reports.ts
import { ComputedSession, formatDuration } from '@/types/database';

interface ReportOptions {
  userName: string;
  date: Date;
  sessions: ComputedSession[];
  userId: string;
  regionCode?: string;
}

export function generateRefCode(
  userId: string,
  sessionCount: number,
  regionCode: string = 'XX'
): string {
  const now = new Date();
  const userPart = userId.replace(/-/g, '').slice(-4).toUpperCase();
  const datePart = `${(now.getMonth() + 1).toString().padStart(2, '0')}${now
    .getDate()
    .toString()
    .padStart(2, '0')}`;
  const sessionsPart = Math.min(sessionCount, 99).toString().padStart(2, '0');
  return `${regionCode}-${userPart}-${datePart}-${sessionsPart}`;
}

export function generateReport(options: ReportOptions): string {
  const { userName, date, sessions, userId, regionCode = 'XX' } = options;

  const totalMinutes = sessions.reduce(
    (sum, session) => sum + session.duration_minutes - session.pause_minutes,
    0
  );

  const dateStr = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  let report = `${userName}\n`;
  report += `--------------------\n`;
  report += `📅  ${dateStr}\n`;

  sessions.forEach((session) => {
    const entryTime = new Date(session.entry_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const exitTime = session.exit_at
      ? new Date(session.exit_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'In Progress';

    report += `📍 ${session.location_name || 'Unknown Location'}\n`;

    if (session.manually_edited) {
      report += `*Edited ➜ ${entryTime} -> ${exitTime}\n`;
    } else {
      report += `➜ ${entryTime} -> ${exitTime}\n`;
    }

    if (session.pause_minutes > 0) {
      report += `Break: ${session.pause_minutes}min\n`;
    }

    const netMinutes = session.duration_minutes - session.pause_minutes;
    report += `➜ ${formatDuration(netMinutes)}\n\n`;
  });

  report += `====================\n`;
  report += `TOTAL: ${formatDuration(totalMinutes)}\n\n`;
  report += `OnSite Timekeeper\n`;
  report += `Ref #   ${generateRefCode(userId, sessions.length, regionCode)}\n`;

  return report;
}
