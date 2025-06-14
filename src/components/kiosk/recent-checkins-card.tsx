
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FormattedCheckIn } from '@/lib/types';
import { format } from 'date-fns';
import { ListChecks, Search, CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentCheckinsCardProps {
  newCheckinEntry: FormattedCheckIn | null;
  initialCheckins: FormattedCheckIn[];
  className?: string;
}

export function RecentCheckinsCard({ newCheckinEntry, initialCheckins, className }: RecentCheckinsCardProps) {
  const [displayedCheckins, setDisplayedCheckins] = useState<FormattedCheckIn[]>([]);
  const [filterTerm, setFilterTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Initialize with initialCheckins, sorted by most recent
    setDisplayedCheckins([...initialCheckins].sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime()));
  }, [initialCheckins]);
  
  useEffect(() => {
    if (newCheckinEntry) {
      setDisplayedCheckins((prevCheckins) => 
        [newCheckinEntry, ...prevCheckins].sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime())
      );
    }
  }, [newCheckinEntry]);

  const filteredCheckins = useMemo(() => {
    return displayedCheckins.filter((checkin) => {
      const matchesTerm = filterTerm.toLowerCase() === '' ||
        checkin.memberName.toLowerCase().includes(filterTerm.toLowerCase()) ||
        checkin.memberId.toLowerCase().includes(filterTerm.toLowerCase());
      
      const matchesDate = !filterDate || 
        format(checkin.checkInTime, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
        
      return matchesTerm && matchesDate;
    });
  }, [displayedCheckins, filterTerm, filterDate]);

  const clearDateFilter = () => {
    setFilterDate(undefined);
  };

  return (
    <Card className={cn("max-w-lg shadow-lg w-full", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-headline">Recent Check-ins</CardTitle>
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <CardDescription>Live feed of member arrivals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by Name or Member ID..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal h-10",
                  !filterDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {filterDate && (
             <Button variant="ghost" size="icon" onClick={clearDateFilter} className="h-10 w-10 sm:ml-1">
                <X className="h-4 w-4" />
                <span className="sr-only">Clear date filter</span>
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px] pr-3 border rounded-md">
          {filteredCheckins.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              No check-ins match your filters or no check-ins yet.
            </p>
          ) : (
            filteredCheckins.map((checkin, index) => (
              <div key={`${checkin.memberTableId}-${checkin.checkInTime.toISOString()}-${index}`}>
                <div className="p-3 hover:bg-muted/50 transition-colors rounded-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-primary">
                      {checkin.memberName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {format(checkin.checkInTime, "p")}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <p className="text-foreground/80">ID: {checkin.memberId}</p>
                     <p className="text-muted-foreground">
                       {format(checkin.checkInTime, "MMM d, yyyy")}
                     </p>
                  </div>
                   <p className="text-xs text-muted-foreground/70">Gym: {checkin.gymName}</p>
                </div>
                {index < filteredCheckins.length - 1 && <Separator className="my-1 bg-border/50" />}
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
