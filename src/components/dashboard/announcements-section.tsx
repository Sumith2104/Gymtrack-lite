
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Announcement } from '@/lib/types';
import { Megaphone, AlertCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MOCK_FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announcement-fallback-1',
    title: 'Welcome to GymTrack Lite!',
    content: 'This is your announcements section. Important updates and news will appear here.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    gymId: 'GYM123_default',
  },
];

export function AnnouncementsSection({ className }: { className?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGymDbId, setCurrentGymDbId] = useState<string | null>(null);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const { toast } = useToast();

  const loadAnnouncements = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        const gymIdFromStorage = localStorage.getItem('gymDatabaseId');
        setCurrentGymDbId(gymIdFromStorage);

        const announcementsRaw = localStorage.getItem('gymAnnouncements');
        let allAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
        
        const relevantAnnouncements = allAnnouncements.filter(ann => ann.gymId === gymIdFromStorage);

        if (relevantAnnouncements.length === 0 && !gymIdFromStorage) {
           setAnnouncements(MOCK_FALLBACK_ANNOUNCEMENTS.filter(a => a.gymId === 'GYM123_default'));
        } else if (relevantAnnouncements.length === 0 && gymIdFromStorage) {
           setAnnouncements([]);
        } else {
          setAnnouncements(relevantAnnouncements);
        }
      } else {
        setAnnouncements(MOCK_FALLBACK_ANNOUNCEMENTS.filter(a => a.gymId === 'GYM123_default'));
      }
    } catch (e: any) {
      console.error("Error loading announcements from localStorage:", e);
      setError("Could not load announcements.");
      setAnnouncements(MOCK_FALLBACK_ANNOUNCEMENTS.filter(a => a.gymId === 'GYM123_default'));
    } finally {
      setIsLoading(false);
      setSelectedAnnouncements([]); // Clear selection on reload
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
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

  const handleSelectAnnouncement = (id: string, checked: boolean) => {
    setSelectedAnnouncements(prev => 
      checked ? [...prev, id] : prev.filter(annId => annId !== id)
    );
  };

  const handleDeleteSelected = () => {
    if (selectedAnnouncements.length === 0) {
      toast({ title: "No announcements selected", variant: "destructive" });
      return;
    }
    try {
      const announcementsRaw = localStorage.getItem('gymAnnouncements');
      let allAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
      const remainingAnnouncements = allAnnouncements.filter(ann => !selectedAnnouncements.includes(ann.id));
      localStorage.setItem('gymAnnouncements', JSON.stringify(remainingAnnouncements));
      
      // Update local state
      setAnnouncements(prev => prev.filter(ann => !selectedAnnouncements.includes(ann.id)));
      setSelectedAnnouncements([]);
      window.dispatchEvent(new Event('storage')); // Notify other parts of the app of a change

      toast({ title: "Announcements Deleted", description: `${selectedAnnouncements.length} announcement(s) removed.`});
    } catch (e) {
      console.error("Error deleting announcements:", e);
      toast({ title: "Error", description: "Could not delete announcements.", variant: "destructive" });
    }
  };

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Announcements</CardTitle>
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-row items-center justify-between">
            <CardDescription className="text-xs">Latest news for your gym. Select to manage.</CardDescription>
            {selectedAnnouncements.length > 0 && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="ml-auto">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedAnnouncements.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete {selectedAnnouncements.length} selected announcement(s).
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
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
                <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                        id={`ann-${announcement.id}`}
                        checked={selectedAnnouncements.includes(announcement.id)}
                        onCheckedChange={(checked) => handleSelectAnnouncement(announcement.id, !!checked)}
                        className="mt-1"
                    />
                    <div className="flex-1">
                        <label htmlFor={`ann-${announcement.id}`} className="font-semibold text-sm text-primary cursor-pointer hover:underline">{announcement.title}</label>
                        <p className="text-xs text-muted-foreground mb-1">
                            {isValid(parseISO(announcement.createdAt)) ? formatDistanceToNow(parseISO(announcement.createdAt), { addSuffix: true }) : 'Invalid date'}
                        </p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                    </div>
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

    