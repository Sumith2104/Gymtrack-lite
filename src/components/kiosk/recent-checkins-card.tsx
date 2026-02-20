
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
import { ListChecks, Search, CalendarIcon as CalendarIconLucide, X, RefreshCw, AlertCircle, PackageSearch, Clock, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAllCheckInsForKioskAction } from '@/app/actions/kiosk-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';


interface RecentCheckinsCardProps {
  newCheckinEntry: FormattedCheckIn | null;
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

  const loadCheckins = useCallback(async (currentGymDbId: string, currentGymName: string) => {
    setIsLoading(true);
    setError(null);
    const response = await fetchAllCheckInsForKioskAction(currentGymDbId, currentGymName);
    if (response.error || !response.checkIns) {
      setError(response.error || "Failed to load check-ins.");
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
      loadCheckins(id, name);
    } else {
      setIsLoading(false);
      setError("Kiosk not configured (no Gym ID/Name).");
    }
  }, [loadCheckins]);
  
  useEffect(() => {
    if (newCheckinEntry) {
      setAllFetchedCheckins((prevCheckins) => 
        [newCheckinEntry, ...prevCheckins.filter(ci => ci.checkInRecordId !== newCheckinEntry.checkInRecordId)] 
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
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
    return format(date, "MMMM d, yyyy");
  };

  return (
    <Card className={cn("shadow-xl w-full bg-card/75 text-card-foreground backdrop-blur-sm bg-opacity-75 border-border rounded-lg", className)}>
      <CardHeader className="p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className='flex-grow flex items-center'>
                <ListChecks className="h-6 w-6 text-primary mr-3" />
                <div>
                    <CardTitle className="text-xl font-semibold text-foreground/90">Recent Check-ins</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Log of the 100 most recent check-ins. Filter by name, ID, or date.
                    </CardDescription>
                </div>
                 {gymDbId && gymNameForDisplay && !isLoading && (
                    <Button variant="ghost" size="icon" className="ml-2 h-8 w-8" onClick={() => loadCheckins(gymDbId, gymNameForDisplay)}>
                        <RefreshCw className="h-4 w-4"/>
                        <span className="sr-only">Refresh List</span>
                    </Button>
                )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="text" placeholder="Filter by name or ID..." value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="pl-9 h-10 bg-input border-input focus:ring-primary"/>
                </div>
                <div className='relative w-full sm:w-auto min-w-[180px]'>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10 bg-input border-input hover:bg-muted/50 focus:ring-primary", !filterDate && "text-muted-foreground")}>
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
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4">
              {Array.from({length: 5}).map((_, i) => <Skeleton key={`skel-${i}`} className="h-12 w-full my-2 rounded-md" />)}
            </div>
          ) : error ? (
            <div className="p-6 sm:p-8">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Error Loading Check-ins</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
          ) : sortedDateKeys.length === 0 ? (
            <div className="p-6 sm:p-8">
              <Alert className="bg-muted/30 border-border/50 text-foreground">
                <div className="flex items-center">
                  <PackageSearch className="h-5 w-5 mr-2" />
                  <AlertTitle>No Matching Check-ins</AlertTitle>
                </div>
                <AlertDescription>
                  No check-ins match your current filters or no check-ins have been recorded for this gym.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-0">
              {sortedDateKeys.map((dateKey, groupIndex) => (
                <div 
                  key={dateKey} 
                  className={cn(
                    "pt-4 px-4 sm:px-6",
                    groupIndex === 0 && "first:pt-6", 
                    groupIndex === sortedDateKeys.length - 1 && "last:pb-6"
                  )}
                >
                  <div className="flex items-center mb-3">
                    <CalendarIconLucide className="mr-2 h-5 w-5 text-primary/80" />
                    <h3 className="text-sm font-semibold text-foreground/80">{formatDateGroupHeader(dateKey)}</h3>
                  </div>
                  <Separator className="mb-3 bg-border/50" />
                  <div className="overflow-x-auto pb-4">
                    <div className="grid grid-cols-3 gap-x-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
                      <div className="text-left col-span-1">Member Name</div>
                      <div className="flex items-center justify-center col-span-1 gap-1"><Fingerprint className="h-3 w-3"/>Member ID</div>
                      <div className="flex items-center justify-end col-span-1 gap-1"><Clock className="h-3 w-3"/>Checked In</div>
                    </div>
                    <div className="divide-y divide-border/30">
                      {groupedCheckins[dateKey].map((checkin) => (
                        <div key={checkin.checkInRecordId} className="grid grid-cols-3 gap-x-4 items-center py-3 hover:bg-muted/20 transition-colors duration-150">
                          <div className="text-sm text-foreground truncate text-left col-span-1" title={checkin.memberName}>{checkin.memberName}</div>
                          <div className="text-sm text-foreground truncate text-center col-span-1" title={checkin.memberId}>{checkin.memberId}</div>
                          <div className="text-sm text-muted-foreground text-right col-span-1">{format(new Date(checkin.checkInTime), "d MMM, h:mm aa")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                   {groupIndex < sortedDateKeys.length - 1 && <Separator className="mt-4 bg-border" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
