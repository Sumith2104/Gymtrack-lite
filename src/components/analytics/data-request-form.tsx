
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, subDays } from 'date-fns';
import { CalendarIcon, Download, Database, Users, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateDataReportAction } from '@/app/actions/analytics-actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

const dataRequestSchema = z.object({
  reportType: z.string({
    required_error: 'Please select a report type.',
  }),
  dateRange: z.object(
    {
      from: z.date({ required_error: 'A start date is required.' }),
      to: z.date({ required_error: 'An end date is required.' }),
    },
    { required_error: 'Please select a date range.' }
  ),
});

type DataRequestFormValues = z.infer<typeof dataRequestSchema>;

const reportTypes = [
  { value: 'check_in_history', label: 'Member Check-in History', icon: Users },
  { value: 'payment_records', label: 'New Member Payments', icon: Receipt },
];

export function DataRequestForm() {
  const { toast } = useToast();
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    setGymDatabaseId(localStorage.getItem('gymDatabaseId'));
  }, []);
  
  const form = useForm<DataRequestFormValues>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: {
      dateRange: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
    },
  });
  
  useEffect(() => {
    if (date?.from && date?.to) {
        form.setValue('dateRange', {from: date.from, to: date.to});
    }
  }, [date, form]);

  const downloadCSV = (csvData: string, reportType: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  async function onSubmit(data: DataRequestFormValues) {
    if (!gymDatabaseId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not identify gym. Please log in again.',
      });
      return;
    }

    const response = await generateDataReportAction(data, gymDatabaseId);

    if (response.csvData) {
      downloadCSV(response.csvData, data.reportType);
      toast({
        title: 'Download Started!',
        description: 'Your CSV report is being downloaded.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: response.error || 'Could not generate your report. Please try again.',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5 text-primary" />
          Generate Data Report
        </CardTitle>
        <CardDescription>
          Export your gym's data as a CSV file for analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a report type..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {reportTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center">
                                <type.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {type.label}
                            </div>
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date range</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={'outline'}
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !date && 'text-muted-foreground'
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                <>
                                    {format(date.from, 'LLL dd, y')} -{' '}
                                    {format(date.to, 'LLL dd, y')}
                                </>
                                ) : (
                                format(date.from, 'LLL dd, y')
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  'Generating...'
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Generate & Download CSV
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
