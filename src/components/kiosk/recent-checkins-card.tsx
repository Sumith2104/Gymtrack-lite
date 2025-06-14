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
import { format, parseISO } from 'date-fns';
import { ListChecks, Search, CalendarIcon as CalendarIconLucide, X } from 'lucide-react'; // Renamed to avoid conflict
import { cn } from '@/lib/utils';

interface RecentCheckinsCardProps {
  newCheckinEntry: FormattedCheckIn | null;
  initialCheckins: FormattedCheckIn[];
  className?: string;
}

interface GroupedCheckIns {
  [dateKey: string]: FormattedCheckIn[];
}

export function RecentCheckinsCard({ newCheckinEntry, initialCheckins, className }: RecentCheckinsCardProps) {
  const [displayedCheckins, setDisplayedCheckins] = useState<FormattedCheckIn[]>([]);
  const [filterTerm, setFilterTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setDisplayedCheckins([...initialCheckins].sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()));
  }, [initialCheckins]);
  
  useEffect(() => {
    if (newCheckinEntry) {
      setDisplayedCheckins((prevCheckins) => 
        [newCheckinEntry, ...prevCheckins].sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
      );
    }
  }, [newCheckinEntry]);

  const filteredCheckins = useMemo(() => {
    return displayedCheckins.filter((checkin) => {
      const matchesTerm = filterTerm.toLowerCase() === '' ||
        checkin.memberName.toLowerCase().includes(filterTerm.toLowerCase()) ||
        checkin.memberId.toLowerCase().includes(filterTerm.toLowerCase());
      
      const checkinDate = new Date(checkin.checkInTime);
      const matchesDate = !filterDate || 
        format(checkinDate, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
        
      return matchesTerm && matchesDate;
    });
  }, [displayedCheckins, filterTerm, filterDate]);

  const groupedCheckins = useMemo(() => {
    return filteredCheckins.reduce((acc: GroupedCheckIns, checkin) => {
      const checkinDate = new Date(checkin.checkInTime);
      const dateKey = format(checkinDate, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(checkin);
      return acc;
    }, {});
  }, [filteredCheckins]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedCheckins).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedCheckins]);

  const clearDateFilter = () => {
    setFilterDate(undefined);
  };

  return (
    <Card className={cn("shadow-lg w-full", className)}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-headline">Recent Check-ins</CardTitle>
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <CardDescription>A log of the latest member check-ins, grouped by date. Filter by name, ID, or date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by name or ID..."
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
                <CalendarIconLucide className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "PPP") : <span>Pick a date</span>}
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
        
        {/* Column Headers */}
        <div className="hidden md:flex px-3 py-2 border-b border-border">
          <div className="flex-1 font-semibold text-sm text-muted-foreground">Member Name</div>
          <div className="w-32 text-center font-semibold text-sm text-muted-foreground">Member ID</div>
          <div className="w-32 text-right font-semibold text-sm text-muted-foreground">Date</div>
        </div>

        <ScrollArea className="h-[300px] pr-1">
          {sortedDateKeys.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              No check-ins match your filters or no check-ins yet for this gym.
            </p>
          ) : (
            sortedDateKeys.map((dateKey) => (
              <div key={dateKey} className="mb-4">
                <h3 className="text-md font-semibold text-primary px-3 py-2 bg-muted/30 rounded-t-md flex items-center">
                  <CalendarIconLucide className="mr-2 h-4 w-4" />
                  {format(parseISO(dateKey), "d MMM yyyy")}
                </h3>
                <div className="border border-t-0 rounded-b-md border-border/50">
                  {groupedCheckins[dateKey].map((checkin, index) => (
                    <div key={`${checkin.memberTableId}-${new Date(checkin.checkInTime).toISOString()}-${index}`}>
                      <div className="flex flex-col md:flex-row items-start md:items-center p-3 hover:bg-muted/50 transition-colors rounded-md">
                        <div className="flex-1 mb-1 md:mb-0">
                          <p className="font-medium text-sm text-foreground">
                            {checkin.memberName}
                          </p>
                          <p className="md:hidden text-xs text-muted-foreground">ID: {checkin.memberId}</p>
                        </div>
                        <div className="w-full md:w-32 md:text-center text-xs text-muted-foreground">
                          <span className="md:hidden font-medium text-foreground/80">ID: </span>{checkin.memberId}
                        </div>
                        <div className="w-full md:w-32 md:text-right text-xs text-muted-foreground">
                           <span className="md:hidden font-medium text-foreground/80">Checked-in: </span>{format(new Date(checkin.checkInTime), "PP p")}
                        </div>
                      </div>
                      {index < groupedCheckins[dateKey].length - 1 && <Separator className="my-0 bg-border/30" />}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
