// app/(dashboard)/dashboard/team/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AccessGrant } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { QRCodeScanner } from '@/components/QRCodeScanner';

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
          viewer_profile:profiles!access_grants_viewer_id_fkey(full_name, email)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      // Grants where I'm the viewer (people whose hours I can view)
      const { data: viewerGrantsData } = await supabase
        .from('access_grants')
        .select(`
          *,
          owner_profile:profiles!access_grants_owner_id_fkey(full_name, email)
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

  const handleApproveGrant = async (grantId: string) => {
    try {
      const { error } = await supabase
        .from('access_grants')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', grantId);

      if (error) throw error;
      await loadGrants();
    } catch (err: any) {
      alert(err.message || 'Failed to approve access');
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

  const pendingGrants = myGrants.filter((g) => g.status === 'pending');
  const activeGrants = myGrants.filter((g) => g.status === 'active');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Team</h1>
        <p className="text-text-secondary">
          Manage access to your timesheet and view your team's hours
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Button onClick={() => setIsQROpen(true)}>
          🔗 Generate QR Code
        </Button>
        <Button variant="secondary" onClick={() => setIsScanOpen(true)}>
          📷 Scan QR Code
        </Button>
      </div>

      {/* Pending Requests */}
      {pendingGrants.length > 0 && (
        <div className="bg-surface rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Pending Requests ({pendingGrants.length})
          </h2>
          <div className="space-y-3">
            {pendingGrants.map((grant) => (
              <div
                key={grant.id}
                className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-warning"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {grant.viewer_profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {grant.viewer_profile?.email}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Requested: {new Date(grant.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproveGrant(grant.id)}
                  >
                    ✓ Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRevokeGrant(grant.id)}
                  >
                    ✗ Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Managers */}
      <div className="bg-surface rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          People with Access ({activeGrants.length})
        </h2>

        {activeGrants.length === 0 ? (
          <p className="text-text-muted text-center py-8">
            No one has access to your timesheet yet
          </p>
        ) : (
          <div className="space-y-3">
            {activeGrants.map((grant) => (
              <div
                key={grant.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {grant.viewer_profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {grant.viewer_profile?.email}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Access granted:{' '}
                    {grant.accepted_at
                      ? new Date(grant.accepted_at).toLocaleDateString()
                      : new Date(grant.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleRevokeGrant(grant.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workers I Can View */}
      <div className="bg-surface rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Workers I Can View ({viewerGrants.length})
        </h2>

        {viewerGrants.length === 0 ? (
          <p className="text-text-muted text-center py-8">
            You haven't linked to any workers yet
          </p>
        ) : (
          <div className="space-y-3">
            {viewerGrants.map((grant) => (
              <div
                key={grant.id}
                className="flex justify-between items-center p-4 bg-blue-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {grant.owner_profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {grant.owner_profile?.email}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Linked: {new Date(grant.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    // TODO: Navigate to view worker's hours
                    alert('View hours feature coming soon');
                  }}
                >
                  View Hours
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <QRCodeGenerator
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      <QRCodeScanner
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSuccess={loadGrants}
      />
    </div>
  );
}
