
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Member, AttendanceSummary } from '@/lib/types';
import { format } from 'date-fns';
import { CalendarCheck, History, ListChecks } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

interface AttendanceOverviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  member: Member | null;
  attendanceSummary: AttendanceSummary | null;
}

export function AttendanceOverviewDialog({
  isOpen,
  onOpenChange,
  member,
  attendanceSummary,
}: AttendanceOverviewDialogProps) {
  if (!member) {
    return null;
  }

  const renderBody = () => {
    if (!attendanceSummary) {
      return (
        <div className="grid gap-4 py-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <div>
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid gap-4 py-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
          <div className="flex items-center">
            <CalendarCheck className="mr-2 h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Total Check-ins</span>
          </div>
          <Badge variant="secondary" className="text-sm">{attendanceSummary.totalCheckIns}</Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
           <div className="flex items-center">
            <History className="mr-2 h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Last Check-in</span>
          </div>
          <span className="text-sm text-foreground">
            {attendanceSummary.lastCheckInTime
              ? format(attendanceSummary.lastCheckInTime, 'PPpp')
              : 'N/A'}
          </span>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-primary flex items-center">
              <ListChecks className="mr-2 h-4 w-4" />
              Last 5 Recent Check-ins:
          </h4>
          {attendanceSummary.recentCheckIns.length > 0 ? (
            <ScrollArea className="h-[150px] w-full rounded-md p-3 bg-card">
              <ul className="space-y-2">
                {attendanceSummary.recentCheckIns.map((checkInDate, index) => (
                  <li key={index} className="text-xs text-muted-foreground">
                    {format(checkInDate, 'PPp')}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-card rounded-md">No recent check-in data available.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center font-headline">
            <ListChecks className="mr-2 h-6 w-6 text-primary" />
            Attendance Overview for {member.name}
          </DialogTitle>
          <DialogDescription>
            Summary of check-in activity for Member ID: {member.memberId}.
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}
