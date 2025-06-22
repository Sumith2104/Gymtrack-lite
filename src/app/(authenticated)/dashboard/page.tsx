
'use client';

import { useState, useEffect } from 'react';
import { OccupancyCard } from '@/components/dashboard/occupancy-card';
import { CheckinTrendsChart } from '@/components/dashboard/checkin-trends-chart';
import { AnnouncementsSection } from '@/components/dashboard/announcements-section';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';


export default function DashboardPage() {
  const [gymName, setGymName] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGymName = localStorage.getItem('gymName');
      setGymName(storedGymName);

      const showUpiToast = localStorage.getItem('showUpiToast');
      if (showUpiToast === 'true') {
        toast({
          title: "Setup Payments",
          description: "No UPI ID is integrated. Please set it up in your profile to receive payments.",
          duration: 9000,
        });
        localStorage.removeItem('showUpiToast'); // Remove after showing
      }

      const showInactiveSoonToast = localStorage.getItem('showInactiveSoonToast');
      if (showInactiveSoonToast === 'true') {
        toast({
          title: "Account Warning",
          description: "Your gym account will be inactive soon. Please contact support.",
          duration: 9000,
          variant: 'destructive',
        });
        localStorage.removeItem('showInactiveSoonToast');
      }
    }
  }, [toast]);

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {gymName ? `Welcome to ${gymName}` : 'Gym Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of current gym status, activity trends, and important updates.
        </p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyCard className="lg:col-span-1" />
        <CheckinTrendsChart className="lg:col-span-2" />
      </div>
      
      <Separator className="my-2 bg-border" /> 

      <div className="grid grid-cols-1 gap-6">
        <AnnouncementsSection />
      </div>
    </div>
  );
}
