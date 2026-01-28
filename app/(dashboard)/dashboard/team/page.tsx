// app/(dashboard)/dashboard/team/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AccessGrant } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { BackButton } from '@/components/BackButton';
import { WorkerHoursModal } from '@/components/WorkerHoursModal';

interface GrantWithProfile extends AccessGrant {
  viewer_profile?: { full_name: string; email: string };
  owner_profile?: { full_name: string; email: string };
}

export default function TeamPage() {
  const [myGrants, setMyGrants] = useState<GrantWithProfile[]>([]);
  const [viewerGrants, setViewerGrants] = useState<GrantWithProfile[]>([]);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingGrant, setViewingGrant] = useState<GrantWithProfile | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadGrants();
  }, []);

  const loadGrants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Grants where I'm the owner (people viewing my hours)
      const { data: ownerGrants } = await supabase
        .from('access_grants')
        .select(`
          *,
          viewer_profile:core_profiles!access_grants_viewer_id_fkey(full_name, email)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      // Grants where I'm the viewer (people whose hours I can view)
      const { data: viewerGrantsData } = await supabase
        .from('access_grants')
        .select(`
          *,
          owner_profile:core_profiles!access_grants_owner_id_fkey(full_name, email)
        `)
        .eq('viewer_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setMyGrants((ownerGrants as GrantWithProfile[]) || []);
      setViewerGrants((viewerGrantsData as GrantWithProfile[]) || []);
    } catch (err) {
      console.error('Error loading grants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) return;

    try {
      const { error } = await supabase
        .from('access_grants')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('id', grantId);

      if (error) throw error;
      await loadGrants();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke access');
    }
  };

  const activeGrants = myGrants.filter((g) => g.status === 'active');

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="text-text-secondary text-sm">{viewerGrants.length} workers linked</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setIsQROpen(true)}
          className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-4 px-3 hover:bg-gray-50 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span className="text-sm font-medium text-text-primary">Share My Hours</span>
        </button>
        <button
          onClick={() => setIsScanOpen(true)}
          className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-4 px-3 hover:bg-gray-50 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-sm font-medium text-text-primary">Scan QR Code</span>
        </button>
      </div>

      {/* Workers List */}
      {viewerGrants.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Workers Linked</h3>
          <p className="text-text-muted text-sm max-w-xs mx-auto">
            Ask workers to share their access with you by scanning their QR code above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {viewerGrants.map((grant) => (
            <div
              key={grant.id}
              className="flex items-center justify-between bg-white rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {(grant.owner_profile?.full_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    {grant.owner_profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-text-muted">
                    Linked {new Date(grant.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingGrant(grant)}
                className="text-primary font-medium text-sm"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* People with Access Section */}
      {activeGrants.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            People with Access to My Hours
          </h2>
          <div className="space-y-3">
            {activeGrants.map((grant) => (
              <div
                key={grant.id}
                className="flex items-center justify-between bg-white rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-text-secondary font-semibold">
                      {(grant.viewer_profile?.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      {grant.viewer_profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {grant.viewer_profile?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeGrant(grant.id)}
                  className="text-error font-medium text-sm"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <QRCodeGenerator
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      <QRCodeScanner
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSuccess={loadGrants}
      />

      <WorkerHoursModal
        isOpen={!!viewingGrant}
        onClose={() => setViewingGrant(null)}
        workerId={viewingGrant?.owner_id || ''}
        workerName={viewingGrant?.owner_profile?.full_name || 'Worker'}
      />
    </div>
  );
}
