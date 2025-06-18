
'use client';

import { useState, useEffect } from 'react';
import { CheckinForm } from '@/components/kiosk/checkin-form';
import { RecentCheckinsCard } from '@/components/kiosk/recent-checkins-card';
import type { FormattedCheckIn } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function KioskPage() {
  const [newlyAddedCheckin, setNewlyAddedCheckin] = useState<FormattedCheckIn | null>(null);
  const [kioskGymName, setKioskGymName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymName = localStorage.getItem('gymName');
      setKioskGymName(gymName); 
    }
  }, []);

  const handleSuccessfulCheckin = (checkinEntry: FormattedCheckIn) => {
    setNewlyAddedCheckin(checkinEntry);
  };

  return (
    <div className="flex-1 flex flex-col bg-black text-foreground">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-8">
        {/* Page Title & Subtitle Section */}
        <div className="w-full max-w-2xl text-center">
          <div className="h-1.5 w-32 rounded-full bg-primary mx-auto mb-4"></div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {kioskGymName ? `${kioskGymName} Check-in` : 'Member Check-in'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enter your member ID or scan your QR code to sign in.
          </p>
        </div>
        <Separator className="w-full max-w-2xl bg-border" />

        {/* Main Content Area: Check-in Form */}
        <div className="w-full max-w-2xl"> {/* Unified max-width */}
          <CheckinForm 
            onSuccessfulCheckin={handleSuccessfulCheckin}
          />
        </div>
        
        <Separator className="w-full max-w-2xl bg-border" /> {/* Unified max-width */}

        {/* Recent Check-ins List */}
        <div className="w-full max-w-2xl"> {/* Unified max-width */}
          <RecentCheckinsCard 
            newCheckinEntry={newlyAddedCheckin}
          />
        </div>
      </div>
    </div>
  );
}

