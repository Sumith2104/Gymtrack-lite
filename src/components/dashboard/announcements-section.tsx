
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Announcement } from '@/lib/types';
import { Megaphone, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { parseISO, isValid } from 'date-fns';
import { formatDateIST } from '@/lib/date-utils';
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
import { fetchAnnouncementsAction, deleteAnnouncementsAction } from '@/app/actions/announcement-actions';


export function AnnouncementsSection({ className }: { className?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFormattedGymId, setCurrentFormattedGymId] = useState<string | null>(null);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const { toast } = useToast();

  const loadAnnouncements = useCallback(async (formattedGymId: string | null) => {
    if (!formattedGymId) {
      setIsLoading(false);
      setError("Formatted Gym ID not available. Cannot load announcements.");
      setAnnouncements([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    const response = await fetchAnnouncementsAction(formattedGymId); 
    if (response.error || !response.data) {
      setError(response.error || "Failed to load announcements.");
      setAnnouncements([]);
    } else {
      setAnnouncements(response.data);
    }
    setIsLoading(false);
    setSelectedAnnouncements([]);
  }, []); 

  useEffect(() => {
    const formattedGymIdFromStorage = localStorage.getItem('gymId'); 
    setCurrentFormattedGymId(formattedGymIdFromStorage);
    if (formattedGymIdFromStorage) {
      loadAnnouncements(formattedGymIdFromStorage);
    } else {
      setIsLoading(false);
      setError("Formatted Gym ID not found in local storage. Please log in again.");
      setAnnouncements([]);
    }
  }, [loadAnnouncements]);

  useEffect(() => {
    const handleReloadAnnouncements = () => {
      if (currentFormattedGymId) {
        loadAnnouncements(currentFormattedGymId);
      } else {
        const formattedGymIdFromStorageEvent = localStorage.getItem('gymId');
        if (formattedGymIdFromStorageEvent) {
             loadAnnouncements(formattedGymIdFromStorageEvent);
        }
      }
    };
    window.addEventListener('reloadAnnouncements', handleReloadAnnouncements);
    return () => {
      window.removeEventListener('reloadAnnouncements', handleReloadAnnouncements);
    };
  }, [currentFormattedGymId, loadAnnouncements]);


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

  const handleDeleteSelected = async () => {
    if (selectedAnnouncements.length === 0) {
      toast({ title: "No announcements selected", variant: "destructive" });
      return;
    }
    const response = await deleteAnnouncementsAction(selectedAnnouncements);
    if (response.success) {
      toast({ title: "Announcements Deleted", description: `${selectedAnnouncements.length} announcement(s) removed.`});
      setAnnouncements(prev => prev.filter(ann => !selectedAnnouncements.includes(ann.id)));
      setSelectedAnnouncements([]);
    } else {
      toast({ title: "Error", description: response.error || "Could not delete announcements.", variant: "destructive" });
    }
  };

  return (
    <AlertDialog>
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
             <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Announcements</CardTitle>
          </div>
          {currentFormattedGymId && !isLoading && (
            <Button variant="ghost" size="sm" onClick={() => loadAnnouncements(currentFormattedGymId)}>
                <RefreshCw className="h-4 w-4"/>
            </Button>
          )}
        </div>
        <div className="flex flex-row items-center justify-between">
            <CardDescription className="text-xs">Latest news for your gym. Select to manage.</CardDescription>
            {selectedAnnouncements.length > 0 && (
                 <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="ml-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedAnnouncements.length})
                    </Button>
                </AlertDialogTrigger>
            )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[250px] pr-3">
          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-8 w-3/4" /> <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" /> <Separator className="my-3 bg-border/50" />
              <Skeleton className="h-8 w-2/3" /> <Skeleton className="h-4 w-1/3" />
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
              No announcements yet for {currentFormattedGymId ? "this gym" : "GymTrack Lite"}.
            </p>
          ) : (
            sortedAnnouncements.map((announcement, index) => (
              <div key={announcement.id}>
                <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                        id={`ann-${announcement.id}`}
                        checked={selectedAnnouncements.includes(announcement.id)}
                        onCheckedChange={(checked) => handleSelectAnnouncement(announcement.id, !!checked)}
                        className="mt-1 border-primary"
                    />
                    <div className="flex-1">
                        <label htmlFor={`ann-${announcement.id}`} className="font-semibold text-sm text-primary cursor-pointer hover:underline">{announcement.title}</label>
                        <p className="text-xs text-muted-foreground mb-1">
                            {formatDateIST(announcement.createdAt, 'd MMM yyyy')}
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
    </Card>
    </AlertDialog>
  );
}
