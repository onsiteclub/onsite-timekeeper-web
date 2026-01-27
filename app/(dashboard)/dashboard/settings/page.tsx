// app/(dashboard)/dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/BackButton';

export default function SettingsPage() {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data: profile } = await supabase
          .from('core_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setUserName(profile?.full_name || '');
      }
    } catch (err) {
      console.error('Error loading user info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton />
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
          Profile
        </h2>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {userName ? userName[0].toUpperCase() : 'U'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-text-primary">{userName || 'User'}</p>
            <p className="text-sm text-text-muted">{email}</p>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
          Preferences
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">Notifications</p>
              <p className="text-sm text-text-muted">Get alerts for check-ins</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">Location Services</p>
              <p className="text-sm text-text-muted">Allow GPS tracking</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
          About
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Version</span>
            <span className="text-text-muted">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Terms of Service</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Privacy Policy</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <Button
        variant="danger"
        onClick={handleLogout}
        className="w-full"
      >
        Log Out
      </Button>

      <p className="text-center text-text-muted text-xs mt-6">
        OnSite Timekeeper by OnSite Club
      </p>
    </div>
  );
}
