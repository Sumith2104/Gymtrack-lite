'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Announcement } from '@/lib/types';
import { Megaphone } from 'lucide-react';
import { CreateAnnouncementDialog } from './create-announcement-dialog';
import { formatDistanceToNow } from 'date-fns';


const MOCK_INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announcement-uuid-1',
    title: 'New Yoga Class Added!',
    content: 'Join us for our new Vinyasa Flow yoga class every Wednesday at 6 PM. Suitable for all levels. Sign up at the front desk!',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    gymId: 'GYM123_default', // This should be the gym's UUID (gyms.id) in a real app
  },
  {
    id: 'announcement-uuid-2',
    title: 'Gym Maintenance Notice',
    content: 'Please be advised that the sauna will be closed for maintenance on Friday from 10 AM to 2 PM. We apologize for any inconvenience.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    gymId: 'GYM123_default',
  },
];

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_INITIAL_ANNOUNCEMENTS);

  const handleAnnouncementCreated = (newAnnouncement: Announcement) => {
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
  };
  
  // In a real app, currentGymId (UUID) would come from auth context or props.
  // localStorage.getItem('gymId') currently stores the formattedGymId (e.g., "GYM123").
  // For mock purposes, we assume mock announcements also use formattedGymId in their gymId field.
  const currentFormattedGymId = typeof window !== 'undefined' ? localStorage.getItem('gymId') || 'GYM123_default' : 'GYM123_default';
  
  const gymAnnouncements = announcements
    .filter(ann => ann.gymId === currentFormattedGymId) // Filter by the gym's identifier
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  return (
    <Card className="shadow-lg col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gym Announcements</CardTitle>
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <CardDescription>Latest updates and news for your gym</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <CreateAnnouncementDialog onAnnouncementCreated={handleAnnouncementCreated} />
        </div>
        <ScrollArea className="h-[300px] pr-4">
          {gymAnnouncements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No announcements yet for this gym.</p>
          ) : (
            gymAnnouncements.map((announcement, index) => (
              <div key={announcement.id}>
                <div className="mb-3">
                  <h3 className="font-semibold text-base text-primary">{announcement.title}</h3>
                  <p className="text-xs text-muted-foreground mb-1">
                    {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{announcement.content}</p>
                </div>
                {index < gymAnnouncements.length - 1 && <Separator className="my-3" />}
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
