
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME } from '@/lib/constants';
import { Megaphone, Send, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addDays, format, parse, isValid } from 'date-fns'; 
import { addAnnouncementAction } from '@/app/actions/announcement-actions'; 

const announcementSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).max(1000),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface QuickTemplate {
  id: string;
  label: string;
  title: string;
  content: (date?: string) => string;
  dateSensitive?: boolean;
}

const quickTemplates: QuickTemplate[] = [
  {
    id: 'general',
    label: 'General Update',
    title: 'Important Update',
    content: () => 'Update regarding [topic]. Details: [provide details here].',
  },
  {
    id: 'schedule_change',
    label: 'Class Schedule Change',
    title: 'Class Schedule Update',
    content: (date) => `Class schedule update effective ${date ? date : 'soon'}: [Describe change].\nFull schedule available on app/website.`,
    dateSensitive: true,
  },
  {
    id: 'holiday_closure',
    label: 'Holiday Closure',
    title: 'Holiday Closure Announcement',
    content: (holidayDateInput?: string) => {
      let reopeningDateStr = '[Reopening Date]';
      const holidayDisplayDate = holidayDateInput || '[Holiday Date]';

      if (holidayDateInput) {
        const parsedHolidayDate = parse(holidayDateInput, 'd MMM yyyy', new Date());
        if (isValid(parsedHolidayDate)) {
          const reopeningDate = addDays(parsedHolidayDate, 1);
          reopeningDateStr = format(reopeningDate, 'd MMM yyyy');
        }
      }
      return `Reminder: Gym closed on ${holidayDisplayDate} for [Holiday Name] holiday.\nNormal hours resume ${reopeningDateStr}.`;
    },
    dateSensitive: true,
  },
  {
    id: 'new_equipment',
    label: 'New Equipment',
    title: 'Exciting News: New Equipment!',
    content: () => `New [Type of Equipment] now available on the gym floor.\nCome check it out!`,
  },
];

export default function NewAnnouncementPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const handleTemplateClick = (template: QuickTemplate) => {
    let contentValue: string;
    if (template.dateSensitive) {
      const tomorrow = addDays(new Date(), 1); 
      const formattedHolidayDate = format(tomorrow, 'd MMM yyyy');
      contentValue = template.content(formattedHolidayDate);
    } else {
      contentValue = template.content();
    }
    form.reset({ title: template.title, content: contentValue });
  };

  async function onSubmit(data: AnnouncementFormValues) {
    const ownerFormattedGymId = localStorage.getItem('gymId'); 
    if (!ownerFormattedGymId) {
      toast({ variant: "destructive", title: 'Error', description: 'Formatted Gym ID not found. Please log in again.' });
      return;
    }
    
    const response = await addAnnouncementAction(ownerFormattedGymId, data.title, data.content);

    if (response.error || !response.newAnnouncement) {
        toast({
            variant: "destructive",
            title: 'Error Publishing Announcement',
            description: response.error || 'Could not save announcement. Please try again.',
        });
        return;
    }

    window.dispatchEvent(new Event('reloadAnnouncements'));
    
    let emailFeedback = "Email broadcast initiated.";
    if (response.emailBroadcastResult) {
        const { attempted, successful, noEmailAddress, failed } = response.emailBroadcastResult;
        if (attempted > 0) {
            emailFeedback = `Email broadcast: ${successful}/${attempted} sent. No address for ${noEmailAddress}. Failed: ${failed}.`;
        } else {
            emailFeedback = "No eligible members found for email broadcast.";
        }
    }
    
    toast({
      title: 'Announcement Published!',
      description: `"${data.title}" is now live. ${emailFeedback}`,
      duration: 7000,
    });
    form.reset();
    router.push('/dashboard'); 
  }

  return (
    <div className="flex flex-col gap-6 items-center py-6">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
           <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-3">
            <Megaphone className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-headline">Create New Announcement</CardTitle>
          <CardDescription>
            Share important updates with your gym members. It will be visible on the dashboard and emailed to active/expiring members.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center"><Lightbulb className="h-4 w-4 mr-2 text-primary"/>Quick Templates:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickTemplates.map(template => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateClick(template)}
                    className="text-xs"
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Holiday Hours Update" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Provide details about the announcement..."
                        className="resize-none min-h-[150px]"
                        rows={6}
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Publishing...' : <><Send className="mr-2 h-4 w-4"/> Publish Announcement</>}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
