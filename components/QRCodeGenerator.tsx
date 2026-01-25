// components/QRCodeGenerator.tsx
'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeGenerator({ isOpen, onClose }: QRCodeGeneratorProps) {
  const [token, setToken] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const supabase = createClient();

  const generateToken = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const userName = profile?.full_name || user.email?.split('@')[0] || 'User';

      // Generate token
      const newToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save to pending_tokens
      const { error } = await supabase.from('pending_tokens').insert({
        owner_id: user.id,
        token: newToken,
        owner_name: userName,
        expires_at: expires.toISOString(),
      });

      if (error) throw error;

      setToken(newToken);
      setOwnerName(userName);
      setExpiresAt(expires);
    } catch (err: any) {
      alert(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setToken(null);
    setOwnerName('');
    setExpiresAt(null);
    onClose();
  };

  const qrData = token
    ? JSON.stringify({
        app: 'onsite-timekeeper',
        action: 'link',
        token,
        owner_name: ownerName,
      })
    : '';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Team Linking QR Code">
      <div className="space-y-4">
        {!token ? (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">
              Generate a QR code for managers to scan and link to your timesheet
            </p>
            <Button onClick={generateToken} disabled={loading}>
              {loading ? 'Generating...' : '🔗 Generate QR Code'}
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-lg flex justify-center">
              <QRCodeSVG value={qrData} size={256} level="H" />
            </div>

            <div className="text-center">
              <p className="text-sm text-text-secondary">
                Valid for 5 minutes
              </p>
              {expiresAt && (
                <p className="text-xs text-text-muted mt-1">
                  Expires: {expiresAt.toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-text-secondary">
                <strong>Instructions:</strong>
                <br />
                1. Have your manager open OnSite Timekeeper
                <br />
                2. They should go to Team → Scan QR Code
                <br />
                3. They scan this code to request access
                <br />
                4. You'll need to approve their request
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={generateToken}>
                🔄 Regenerate
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
