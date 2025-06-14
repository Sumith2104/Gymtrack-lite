
'use client';

import { useState, useEffect } from 'react';
import { CheckinForm } from '@/components/kiosk/checkin-form';
import { RecentCheckinsCard } from '@/components/kiosk/recent-checkins-card';
import type { FormattedCheckIn, Member } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';

// Mock members data - in a real app, this would come from a database
const mockKioskMembers: Member[] = [
  { id: 'member-uuid-1', memberId: 'MBR001', name: 'Alice Johnson', email: 'alice@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', membershipStatus: 'expired', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', membershipStatus: 'inactive', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-4', memberId: 'MBR004', name: 'David Brown', email: 'd.brown@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-sumith', memberId: 'SUMITH001', name: 'Sumith Test Kiosk', email: 'sumith.kiosk@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'UOFIPOIB' },
];

// Mock initial check-ins data - in a real app, fetch this for the current gym
const MOCK_INITIAL_CHECKINS: FormattedCheckIn[] = [
    { memberTableId: 'member-uuid-4', memberName: 'David Brown', memberId: 'MBR004', checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), gymName: 'Default Gym' }, // 2 hours ago
    { memberTableId: 'member-uuid-1', memberName: 'Alice Johnson', memberId: 'MBR001', checkInTime: new Date(Date.now() - 5 * 60 * 60 * 1000), gymName: 'Default Gym' }, // 5 hours ago
];


export default function KioskPage() {
  const [kioskGymName, setKioskGymName] = useState<string | null>(null);
  const [kioskGymId, setKioskGymId] = useState<string | null>(null); // This is formatted_gym_id (e.g. GYM123_default)
  const [currentGymDatabaseId, setCurrentGymDatabaseId] = useState<string | null>(null); // This is the actual UUID of the gym

  const [allRecentCheckins, setAllRecentCheckins] = useState<FormattedCheckIn[]>([]);
  const [todaysCheckins, setTodaysCheckins] = useState<FormattedCheckIn[]>([]);
  const [newlyAddedCheckin, setNewlyAddedCheckin] = useState<FormattedCheckIn | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymName = localStorage.getItem('gymName');
      const formattedId = localStorage.getItem('gymId');
      const dbId = localStorage.getItem('gymDatabaseId');

      setKioskGymName(gymName);
      setKioskGymId(formattedId);
      setCurrentGymDatabaseId(dbId);

      // Filter mock initial checkins for the current gym (using formattedId for mock matching)
      // In a real app, you'd fetch based on dbId
      const gymSpecificInitialCheckins = MOCK_INITIAL_CHECKINS.filter(
        // Example: if GYM123_default is the Kiosk ID for 'Default Gym'
        // This logic needs to be robust if gymName in MOCK_INITIAL_CHECKINS is not perfectly aligned
        // For now, simple filter or assume all mocks are for one gym if gymName is consistent
        checkin => (formattedId === 'GYM123_default' && checkin.gymName === 'Default Gym') || 
                   (formattedId === 'UOFIPOIB' && checkin.gymName === 'Sumith Test Kiosk') // Adjust as needed
      );
      setAllRecentCheckins(gymSpecificInitialCheckins);
    }
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    const filtered = allRecentCheckins.filter(
      (ci) => new Date(ci.checkInTime).toDateString() === today
    );
    setTodaysCheckins(filtered);
  }, [allRecentCheckins]);

  const handleSuccessfulCheckin = (checkinEntry: FormattedCheckIn) => {
    setAllRecentCheckins((prevCheckins) => [checkinEntry, ...prevCheckins]);
    setNewlyAddedCheckin(checkinEntry); // For RecentCheckinsCard to pick up
  };

  return (
    <div className="flex flex-1 flex-col py-6 px-4 sm:px-6 lg:px-8 gap-8 selection:bg-primary selection:text-primary-foreground">
      <div className="mb-2 text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {kioskGymName ? `${kioskGymName} - Member Check-in` : 'Member Check-in'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {kioskGymId ? `Kiosk ID: ${kioskGymId} | ` : ''}Enter your member ID or scan your QR code to proceed.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full ml-0"></div>
      </div>

      <div className="flex flex-col gap-6 xl:gap-8 items-center">
        <CheckinForm 
          onSuccessfulCheckin={handleSuccessfulCheckin} 
          todaysCheckins={todaysCheckins}
          className="w-full" 
        />
        <RecentCheckinsCard 
          newCheckinEntry={newlyAddedCheckin}
          initialCheckins={allRecentCheckins.filter(ci => ci.gymName === kioskGymName)} // Pass only relevant initial checkins
          className="w-full" 
        />
      </div>
      
      <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. For assistance, please see reception.</p>
      </footer>
    </div>
  );
}
