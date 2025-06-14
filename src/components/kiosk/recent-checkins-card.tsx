
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FormattedCheckIn } from '@/lib/types';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ListChecks, Search, CalendarIcon as CalendarIconLucide, X, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchTodaysCheckInsForKioskAction } from '@/app/actions/kiosk-actions';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentCheckinsCardProps {
  newCheckinEntry: FormattedCheckIn | null;
  // initialCheckins prop removed, will fetch internally
  className?: string;
}

interface GroupedCheckIns {
  [dateKey: string]: FormattedCheckIn[];
}

export function RecentCheckinsCard({ newCheckinEntry, className }: RecentCheckinsCardProps) {
  const [allFetchedCheckins, setAllFetchedCheckins] = useState<FormattedCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDbId, setGymDbId] = useState<string | null>(null);
  const [gymNameForDisplay, setGymNameForDisplay] = useState<string | null>(null);
  
  const [filterTerm, setFilterTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  const loadTodaysCheckins = useCallback(async (currentGymDbId: string, currentGymName: string) => {
    setIsLoading(true);
    setError(null);
    const response = await fetchTodaysCheckInsForKioskAction(currentGymDbId, currentGymName);
    if (response.error || !response.checkIns) {
      setError(response.error || "Failed to load today's check-ins.");
      setAllFetchedCheckins([]);
    } else {
      setAllFetchedCheckins(response.checkIns.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('gymDatabaseId');
    const name = localStorage.getItem('gymName');
    setGymDbId(id);
    setGymNameForDisplay(name);
    if (id && name) {
      loadTodaysCheckins(id, name);
    } else {
      setIsLoading(false);
      setError("Kiosk not configured (no Gym ID/Name).");
    }
  }, [loadTodaysCheckins]);
  
  useEffect(() => {
    if (newCheckinEntry) {
      setAllFetchedCheckins((prevCheckins) => 
        [newCheckinEntry, ...prevCheckins].sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
      );
    }
  }, [newCheckinEntry]);

  const filteredCheckins = useMemo(() => {
    return allFetchedCheckins.filter((checkin) => {
      const matchesTerm = filterTerm.toLowerCase() === '' ||
        checkin.memberName.toLowerCase().includes(filterTerm.toLowerCase()) ||
        checkin.memberId.toLowerCase().includes(filterTerm.toLowerCase());
      
      const checkinDate = new Date(checkin.checkInTime);
      const matchesDate = !filterDate || 
        format(checkinDate, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
        
      return matchesTerm && matchesDate;
    });
  }, [allFetchedCheckins, filterTerm, filterDate]);

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

  const clearDateFilter = () => setFilterDate(undefined);
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
            <div className='flex-shrink-0 flex items-center'>
                <div className="flex flex-row items-center space-x-2 pb-1">
                    <ListChecks className="h-6 w-6 text-primary" />
                    <CardTitle className="text-xl font-headline">Recent Check-ins</CardTitle>
                </div>
                 {gymDbId && gymNameForDisplay && !isLoading && (
                    <Button variant="ghost" size="sm" className="ml-2" onClick={() => loadTodaysCheckins(gymDbId, gymNameForDisplay)}>
                        <RefreshCw className="h-4 w-4"/>
                    </Button>
                )}
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 flex-shrink-0 sm:ml-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-60">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="text" placeholder="Filter by name or ID..." value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="pl-9 h-10 bg-background"/>
                </div>
                <div className='relative flex-grow sm:flex-grow-0 sm:w-auto'>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10 bg-background border-border hover:bg-muted/50", !filterDate && "text-muted-foreground")}>
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {filterDate ? format(filterDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus /></PopoverContent>
                    </Popover>
                    {filterDate && <Button variant="ghost" size="icon" onClick={clearDateFilter} className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /><span className="sr-only">Clear date filter</span></Button>}
                </div>
            </div>
        </div>
        <CardDescription className="text-xs mt-1">A log of the latest member check-ins for today. Filter by name, ID, or pick a date for historical data (if available).</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[350px] pr-1">
          {isLoading ? (
            Array.from({length: 3}).map((_, i) => <Skeleton key={`skel-${i}`} className="h-10 w-full my-2" />)
          ) : error ? (
            <div className="text-destructive flex flex-col items-center justify-center h-full py-10">
                <AlertCircle className="h-8 w-8 mb-2"/>
                <p className="text-sm font-medium">Error loading check-ins.</p>
                <p className="text-xs">{error}</p>
            </div>
          ) : sortedDateKeys.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              No check-ins match your filters or no check-ins yet for this gym today.
            </p>
          ) : (
            sortedDateKeys.map((dateKey) => (
              <div key={dateKey} className="mb-4">
                <div className="flex items-center px-3 py-2.5 bg-muted/10 rounded-t-md border-b border-border">
                  <CalendarIconLucide className="mr-2 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-primary">{formatDateGroupHeader(dateKey)}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                  <div>Member Name</div><div>Member ID</div><div className="text-left">Check-in Time</div>
                </div>
                <div className="divide-y divide-border">
                  {groupedCheckins[dateKey].map((checkin, index) => (
                    <div key={`${checkin.memberTableId}-${new Date(checkin.checkInTime).toISOString()}-${index}`} className="grid grid-cols-3 gap-4 items-center px-3 py-3 hover:bg-muted/20 transition-colors">
                      <div className="text-sm text-foreground truncate" title={checkin.memberName}>{checkin.memberName}</div>
                      <div className="text-sm text-foreground truncate" title={checkin.memberId}>{checkin.memberId}</div>
                      <div className="text-sm text-muted-foreground text-left">{format(new Date(checkin.checkInTime), "p")}</div>
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
