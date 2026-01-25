// components/QRCodeScanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QRCodeScanner({ isOpen, onClose, onSuccess }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && !scanner) {
      const html5QrCode = new Html5Qrcode('qr-reader');
      setScanner(html5QrCode);
    }

    return () => {
      if (scanner && scanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!scanner) return;

    setError('');
    setScanning(true);

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            const data = JSON.parse(decodedText);

            if (
              data.app === 'onsite-timekeeper' &&
              data.action === 'link' &&
              data.token
            ) {
              await redeemToken(data.token);
            } else {
              throw new Error('Invalid QR code');
            }
          } catch (err: any) {
            setError(err.message || 'Invalid QR code');
          }
        },
        (errorMessage) => {
          // Ignore scan errors (camera still scanning)
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scanner && scanning) {
      await scanner.stop();
      setScanning(false);
    }
  };

  const redeemToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find pending token
      const { data: pending, error: fetchError } = await supabase
        .from('pending_tokens')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !pending) {
        throw new Error('Token invalid or expired');
      }

      // Create access grant - immediate access (no approval needed)
      const { error: grantError } = await supabase
        .from('access_grants')
        .insert({
          owner_id: pending.owner_id,
          viewer_id: user.id,
          token,
          status: 'active',
          accepted_at: new Date().toISOString(),
        });

      if (grantError) {
        if (grantError.code === '23505') {
          throw new Error('You already have access to this worker');
        }
        throw grantError;
      }

      // Delete used token
      await supabase.from('pending_tokens').delete().eq('id', pending.id);

      await stopScanning();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to redeem token');
      await stopScanning();
    }
  };

  const handleClose = async () => {
    await stopScanning();
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan QR Code">
      <div className="space-y-4">
        <div
          id="qr-reader"
          className="w-full rounded-lg overflow-hidden"
          style={{ minHeight: scanning ? '300px' : '0' }}
        />

        {error && (
          <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!scanning ? (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">
              Scan a worker's QR code to get access to their timesheet
            </p>
            <Button onClick={startScanning}>📷 Start Camera</Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-text-secondary mb-4">
              Point your camera at the QR code
            </p>
            <Button variant="secondary" onClick={stopScanning}>
              Stop Scanning
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
