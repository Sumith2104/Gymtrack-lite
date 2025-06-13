
'use client';

import { useState, useEffect } from 'react';
import { CheckinForm } from '@/components/kiosk/checkin-form';
import { RecentCheckinsCard } from '@/components/kiosk/recent-checkins-card';
import type { FormattedCheckIn } from '@/lib/types';
// AppHeader is in RootLayout, so no need to import or render it here

export default function KioskPage() {
  const [lastCheckin, setLastCheckin] = useState<FormattedCheckIn | null>(null);
  const [kioskGymName, setKioskGymName] = useState<string | null>(null);
  const [kioskGymId, setKioskGymId] = useState<string | null>(null); // This is formatted_gym_id

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymName = localStorage.getItem('gymName');
      const gymId = localStorage.getItem('gymId'); // This is the formatted_gym_id
      setKioskGymName(gymName);
      setKioskGymId(gymId);
    }
  }, []);

  const handleSuccessfulCheckin = (checkinEntry: FormattedCheckIn) => {
    setLastCheckin(checkinEntry);
  };

  return (
    // No AppHeader here as it's in RootLayout
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 bg-background text-foreground">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {kioskGymName ? `${kioskGymName} - Member Check-in` : 'Member Check-in'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {kioskGymId ? `Kiosk ID: ${kioskGymId} | ` : ''}Enter your member ID or scan your QR code.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full mx-auto"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-start">
        <CheckinForm onSuccessfulCheckin={handleSuccessfulCheckin} className="lg:col-span-1" />
        <RecentCheckinsCard newCheckinEntry={lastCheckin} className="lg:col-span-1" />
      </div>
    </div>
  );
}
