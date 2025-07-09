
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
    <div className="flex-1 flex flex-col bg-background text-foreground">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Page Title & Subtitle Section */}
        <div className="w-full max-w-4xl"> {/* Removed text-center */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {kioskGymName ? `${kioskGymName} Check-in` : 'Member Check-in'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter the member's ID or scan their QR code to sign them in.
          </p>
          <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div> {/* Removed mx-auto */}
        </div>
        <Separator className="w-full max-w-4xl bg-border" />

        {/* Main Content Area: Check-in Form */}
        <div className="w-full max-w-4xl">
          <CheckinForm 
            onSuccessfulCheckin={handleSuccessfulCheckin}
          />
        </div>
        
        <Separator className="w-full max-w-4xl bg-border" />

        {/* Recent Check-ins List */}
        <div className="w-full max-w-4xl">
          <RecentCheckinsCard 
            newCheckinEntry={newlyAddedCheckin}
          />
        </div>
      </div>
    </div>
  );
}
