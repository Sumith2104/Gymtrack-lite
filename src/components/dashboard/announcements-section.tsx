
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Announcement } from '@/lib/types';
import { Megaphone, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const MOCK_FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announcement-fallback-1',
    title: 'Welcome to GymTrack Lite!',
    content: 'This is your announcements section. Important updates and news will appear here.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    gymId: 'GYM123_default', // A generic fallback gymId
  },
];

export function AnnouncementsSection({ className }: { className?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGymDbId, setCurrentGymDbId] = useState<string | null>(null);

  const loadAnnouncements = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        const gymIdFromStorage = localStorage.getItem('gymDatabaseId');
        setCurrentGymDbId(gymIdFromStorage);

        const announcementsRaw = localStorage.getItem('gymAnnouncements');
        let allAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
        
        // Filter announcements relevant to the current gym
        const relevantAnnouncements = allAnnouncements.filter(ann => ann.gymId === gymIdFromStorage);

        if (relevantAnnouncements.length === 0 && !gymIdFromStorage) {
           // If no gym context and no specific announcements, show generic fallback
           setAnnouncements(MOCK_FALLBACK_ANNOUNCEMENTS.filter(a => a.gymId === 'GYM123_default'));
        } else if (relevantAnnouncements.length === 0 && gymIdFromStorage) {
          // If there's a gym context but no announcements for it yet
           setAnnouncements([]);
        }
        else {
          setAnnouncements(relevantAnnouncements);
        }
      } else {
        // Fallback for SSR or if localStorage is not available (should not happen in 'use client')
        setAnnouncements(MOCK_FALLBACK_ANNOUNCEMENTS.filter(a => a.gymId === 'GYM123_default'));
      }
    } catch (e: any) {
      console.error("Error loading announcements from localStorage:", e);
      setError("Could not load announcements.");
      setAnnouncements(MOCK_FALLBACK_ANNOUNCEMENTS.filter(a => a.gymId === 'GYM123_default')); // Show fallback on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();

    // Listen for storage changes to refresh announcements if modified elsewhere
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'gymAnnouncements' || event.key === 'gymDatabaseId') {
        loadAnnouncements();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAnnouncements]);

  const sortedAnnouncements = announcements
    .sort((a, b) => {
        const dateA = parseISO(a.createdAt);
        const dateB = parseISO(b.createdAt);
        if (!isValid(dateA) && isValid(dateB)) return 1;
        if (isValid(dateA) && !isValid(dateB)) return -1;
        if (!isValid(dateA) && !isValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
    });

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Announcements</CardTitle>
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-xs">Latest news and updates for your gym.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[250px] pr-3">
          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Separator className="my-3 bg-border/50" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-destructive flex flex-col items-center justify-center h-full py-8">
                <AlertCircle className="h-8 w-8 mb-2"/>
                <p className="text-sm font-medium">Error loading announcements.</p>
                <p className="text-xs">{error}</p>
            </div>
          ) : sortedAnnouncements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No announcements yet for {currentGymDbId ? "this gym" : "GymTrack Lite"}.
            </p>
          ) : (
            sortedAnnouncements.map((announcement, index) => (
              <div key={announcement.id}>
                <div className="mb-3">
                  <h3 className="font-semibold text-sm text-primary">{announcement.title}</h3>
                  <p className="text-xs text-muted-foreground mb-1">
                    {isValid(parseISO(announcement.createdAt)) ? formatDistanceToNow(parseISO(announcement.createdAt), { addSuffix: true }) : 'Invalid date'}
                  </p>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                </div>
                {index < sortedAnnouncements.length - 1 && <Separator className="my-3 bg-border/50" />}
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
