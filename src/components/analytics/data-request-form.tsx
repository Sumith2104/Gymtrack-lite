
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, subDays } from 'date-fns';
import { CalendarIcon, Send, Database, FileText, Users, Receipt } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { requestDataReportAction } from '@/app/actions/analytics-actions';
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
  description: z.string().max(500, 'Description must be 500 characters or less.').optional(),
});

type DataRequestFormValues = z.infer<typeof dataRequestSchema>;

const reportTypes = [
  { value: 'check_in_history', label: 'Member Check-in History', icon: Users },
  { value: 'payment_records', label: 'Payment Records', icon: Receipt },
  { value: 'custom_request', label: 'Custom Request', icon: FileText },
];

export function DataRequestForm() {
  const { toast } = useToast();
  const [gymName, setGymName] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    setGymName(localStorage.getItem('gymName'));
    setOwnerEmail(localStorage.getItem('gymOwnerEmail'));
  }, []);
  
  const form = useForm<DataRequestFormValues>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: {
      dateRange: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
      description: '',
    },
  });
  
  useEffect(() => {
    if (date?.from && date?.to) {
        form.setValue('dateRange', {from: date.from, to: date.to});
    }
  }, [date, form]);

  async function onSubmit(data: DataRequestFormValues) {
    if (!gymName || !ownerEmail) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not identify gym owner. Please log in again.',
      });
      return;
    }

    const response = await requestDataReportAction(data, gymName, ownerEmail);

    if (response.success) {
      toast({
        title: 'Request Sent!',
        description: 'Your data report request has been sent to the administrator.',
      });
      form.reset();
      setDate({
        from: subDays(new Date(), 29),
        to: new Date(),
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: response.error || 'Could not send your request. Please try again.',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5 text-primary" />
          Request Custom Data Report
        </CardTitle>
        <CardDescription>
          Need specific data? Fill out the form below to request a custom report from the system admin.
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specific Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Please include member phone numbers in the check-in report.'"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide any additional details or specific columns you need in the report.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit Request
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
