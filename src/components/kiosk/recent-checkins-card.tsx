
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
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ListChecks, Search, CalendarIcon as CalendarIconLucide, X } from 'lucide-react';
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

  const formatDateGroupHeader = (dateKey: string): string => {
    const date = parseISO(dateKey);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, "d MMM yyyy");
  };


  return (
    <Card className={cn("shadow-lg w-full", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className='flex-shrink-0'>
                <div className="flex flex-row items-center space-x-2 pb-1">
                    <ListChecks className="h-6 w-6 text-primary" />
                    <CardTitle className="text-xl font-headline">Recent Check-ins</CardTitle>
                </div>
                <CardDescription className="text-xs">A log of the latest member check-ins, grouped by date. Filter by name, ID, or date.</CardDescription>
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 flex-shrink-0 sm:ml-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-60">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                    type="text"
                    placeholder="Filter by name or ID..."
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="pl-9 h-10 bg-background" // Ensure input background matches card
                    />
                </div>
                <div className='relative flex-grow sm:flex-grow-0 sm:w-auto'>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal h-10 bg-background border-border hover:bg-muted/50", // Ensure button background matches card
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
                        <Button variant="ghost" size="icon" onClick={clearDateFilter} className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Clear date filter</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[350px] pr-1"> {/* Adjusted height slightly */}
          {sortedDateKeys.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              No check-ins match your filters or no check-ins yet for this gym.
            </p>
          ) : (
            sortedDateKeys.map((dateKey) => (
              <div key={dateKey} className="mb-4">
                <div className="flex items-center px-3 py-2.5 bg-muted/10 rounded-t-md border-b border-border">
                  <CalendarIconLucide className="mr-2 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-primary">
                    {formatDateGroupHeader(dateKey)}
                  </h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                  <div>Member Name</div>
                  <div>Member ID</div>
                  <div className="text-left">Date</div>
                </div>

                <div className="divide-y divide-border">
                  {groupedCheckins[dateKey].map((checkin, index) => (
                    <div key={`${checkin.memberTableId}-${new Date(checkin.checkInTime).toISOString()}-${index}`} className="grid grid-cols-3 gap-4 items-center px-3 py-3 hover:bg-muted/20 transition-colors">
                      <div className="text-sm text-foreground truncate" title={checkin.memberName}>
                        {checkin.memberName}
                      </div>
                      <div className="text-sm text-foreground truncate" title={checkin.memberId}>
                        {checkin.memberId}
                      </div>
                      <div className="text-sm text-muted-foreground text-left">
                        {format(new Date(checkin.checkInTime), "d MMM yyyy")}
                      </div>
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

