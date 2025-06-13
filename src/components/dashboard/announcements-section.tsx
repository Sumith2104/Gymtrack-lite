'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Announcement } from '@/lib/types';
import { Megaphone } from 'lucide-react';
// CreateAnnouncementDialog is removed from here as "New Announce" is a nav link now.
// import { CreateAnnouncementDialog } from './create-announcement-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';


const MOCK_INITIAL_ANNOUNCEMENTS: Announcement[] = [
   {
    id: 'announcement-uuid-sumith',
    title: 'New Member Registered: sumith',
    content: "Let's all welcome our newest member, sumith (ID: SUMI0493P), who joined on June 13, 2025 with a Premium membership! We're excited to have them join the GymTrack Lite community.",
    createdAt: new Date(2025, 5, 14).toISOString(), // Jun 14 2025
    gymId: 'UOFIPOIB', // Belongs to Sumith's gym
  },
  {
    id: 'announcement-uuid-1',
    title: 'New Yoga Class Added!',
    content: 'Join us for our new Vinyasa Flow yoga class every Wednesday at 6 PM. Suitable for all levels. Sign up at the front desk!',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    gymId: 'GYM123_default', 
  },
  {
    id: 'announcement-uuid-2',
    title: 'Gym Maintenance Notice',
    content: 'Please be advised that the sauna will be closed for maintenance on Friday from 10 AM to 2 PM. We apologize for any inconvenience.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    gymId: 'GYM123_default',
  },
];

export function AnnouncementsSection({ className }: { className?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentGymId, setCurrentGymId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymIdFromStorage = localStorage.getItem('gymDatabaseId'); // Using the actual gym UUID
      setCurrentGymId(gymIdFromStorage);
      
      // Filter mock announcements based on the actual gym UUID
      // In a real app, these would be fetched from the DB for the currentGymId
      const relevantAnnouncements = MOCK_INITIAL_ANNOUNCEMENTS.filter(
        ann => ann.gymId === gymIdFromStorage || (gymIdFromStorage === null && ann.gymId === 'GYM123_default') // Fallback for no specific gym in LS
      );
      setAnnouncements(relevantAnnouncements);
    } else {
      // Fallback for SSR or if localStorage is not available
       setAnnouncements(MOCK_INITIAL_ANNOUNCEMENTS.filter(ann => ann.gymId === 'GYM123_default'));
    }
  }, []);


  // const handleAnnouncementCreated = (newAnnouncement: Announcement) => {
  //   setAnnouncements((prev) => [newAnnouncement, ...prev]);
  // };
  
  const gymAnnouncements = announcements
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Announcements</CardTitle>
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-xs">Latest news and updates from GymTrack Lite.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Create Announcement Button removed, handled by Nav Link */}
        {/* <div className="mb-4"> <CreateAnnouncementDialog onAnnouncementCreated={handleAnnouncementCreated} /> </div> */}
        <ScrollArea className="h-[250px] pr-3"> {/* Reduced height slightly */}
          {gymAnnouncements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">No announcements yet for this gym.</p>
          ) : (
            gymAnnouncements.map((announcement, index) => (
              <div key={announcement.id}>
                <div className="mb-3">
                  <h3 className="font-semibold text-sm text-primary">{announcement.title}</h3>
                  <p className="text-xs text-muted-foreground mb-1">
                     {/* Using format for specific date from image, and formatDistanceToNow for others */}
                    {announcement.id === 'announcement-uuid-sumith' ? '14 Jun 2025' : formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                </div>
                {index < gymAnnouncements.length - 1 && <Separator className="my-3 bg-border/50" />}
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
