'use client';

import { useState, useEffect } from 'react';
import { CheckinForm } from '@/components/kiosk/checkin-form';
import { APP_NAME } from '@/lib/constants';

export default function KioskPage() {
  const [kioskGymName, setKioskGymName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymName = localStorage.getItem('gymName');
      setKioskGymName(gymName);
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col container mx-auto py-6 px-4 sm:px-6 lg:px-8 gap-8 selection:bg-primary selection:text-primary-foreground">
      <div className="mb-2 text-left"> {/* text-left to match dashboard title alignment */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {kioskGymName ? `${kioskGymName} - Member Check-in` : 'Member Check-in'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter your member ID or scan your QR code to proceed.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full ml-0"></div> {/* ml-0 for left alignment */}
      </div>

      {/* Center the CheckinForm */}
      <div className="flex justify-center">
        <CheckinForm />
      </div>
      
      <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. For assistance, please see reception.</p>
      </footer>
    </div>
  );
}
