
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
import type { Announcement, Member, MembershipStatus } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { Megaphone, Send, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addDays, differenceInDays, format, parseISO, isValid } from 'date-fns';

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
    content: () => 'Hello members,\n\nWe have an important update regarding [topic].\n\nDetails: [provide details here]\n\nThank you,\nThe GymTrack Lite Team',
  },
  {
    id: 'schedule_change',
    label: 'Class Schedule Change',
    title: 'Class Schedule Update',
    content: (date) => `Dear members,\n\nPlease note a change to our class schedule effective ${date ? date : 'soon'}.\n\n[Describe change, e.g., 'The 6 PM Yoga class on Mondays will now start at 6:15 PM.']\n\nCheck the app or website for the full updated schedule.\n\nBest regards,\n${APP_NAME} Team`,
    dateSensitive: true,
  },
  {
    id: 'holiday_closure',
    label: 'Holiday Closure',
    title: 'Holiday Closure Announcement',
    content: (date) => `Hi everyone,\n\nJust a reminder that the gym will be closed on ${date ? date : '[Holiday Date]'} for the [Holiday Name] holiday.\n\nWe will resume normal hours on [Reopening Date].\n\nEnjoy the holiday!\n\nSincerely,\n${APP_NAME} Management`,
    dateSensitive: true,
  },
  {
    id: 'new_equipment',
    label: 'New Equipment',
    title: 'Exciting News: New Equipment Arrived!',
    content: () => `Great news, fitness enthusiasts!\n\nWe've just added new [Type of Equipment, e.g., 'state-of-the-art treadmills'] to the gym floor!\n\nCome check them out and elevate your workout.\n\nSee you at the gym,\nYour ${APP_NAME} Team`,
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
    let content = template.content();
    if (template.dateSensitive) {
      const tomorrow = addDays(new Date(), 1);
      content = template.content(format(tomorrow, 'PPPP')); // PPPP for full date format e.g. "Monday, June 10th, 2024"
    }
    form.reset({ title: template.title, content: content });
  };

  async function onSubmit(data: AnnouncementFormValues) {
    const gymDatabaseId = localStorage.getItem('gymDatabaseId') || 'default_gym_db_id_mock';
    
    const newAnnouncement: Announcement = {
      id: `announcement_page_${Date.now()}`,
      title: data.title,
      content: data.content,
      createdAt: new Date().toISOString(),
      gymId: gymDatabaseId, 
    };

    try {
      // Save announcement
      const existingAnnouncementsRaw = localStorage.getItem('gymAnnouncements');
      const existingAnnouncements: Announcement[] = existingAnnouncementsRaw ? JSON.parse(existingAnnouncementsRaw) : [];
      localStorage.setItem('gymAnnouncements', JSON.stringify([newAnnouncement, ...existingAnnouncements]));
      window.dispatchEvent(new Event('storage'));

      // Simulate fetching members for email broadcast
      const mockMembersForEmail: Array<Pick<Member, 'email' | 'membershipStatus' | 'expiryDate'>> = [
          { email: 'active1@example.com', membershipStatus: 'active', expiryDate: addDays(new Date(), 30).toISOString() },
          { email: 'expiring1@example.com', membershipStatus: 'active', expiryDate: addDays(new Date(), 5).toISOString() },
          { email: 'inactive1@example.com', membershipStatus: 'inactive', expiryDate: addDays(new Date(), 30).toISOString() },
          { email: 'expired1@example.com', membershipStatus: 'expired', expiryDate: addDays(new Date(), -5).toISOString() },
          { email: 'active2@example.com', membershipStatus: 'active', expiryDate: addDays(new Date(), 90).toISOString() },
          { email: 'pending1@example.com', membershipStatus: 'pending', expiryDate: addDays(new Date(), 60).toISOString() },
      ];

      const getSimulatedEffectiveStatus = (member: Pick<Member, 'membershipStatus' | 'expiryDate'>): MembershipStatus => {
        if (member.membershipStatus === 'active' && member.expiryDate) {
          const expiry = parseISO(member.expiryDate);
          if (isValid(expiry)) {
            const daysUntilExpiry = differenceInDays(expiry, new Date());
            if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) return 'expiring soon';
            if (daysUntilExpiry < 0) return 'expired';
          }
        }
        return member.membershipStatus;
      };

      const membersToEmail = mockMembersForEmail.filter(member => {
          const effectiveStatus = getSimulatedEffectiveStatus(member);
          return effectiveStatus === 'active' || effectiveStatus === 'expiring soon';
      });

      const emailedCount = membersToEmail.length;
      const totalRelevantMembers = mockMembersForEmail.filter(m => getSimulatedEffectiveStatus(m) === 'active' || getSimulatedEffectiveStatus(m) === 'expiring soon').length;


      console.log(`SIMULATING: Emailing announcement "${data.title}" to ${emailedCount} members.`);
      membersToEmail.forEach(m => console.log(` -> To: ${m.email}, Status: ${getSimulatedEffectiveStatus(m)}`));
      
      toast({
        title: 'Announcement Published',
        description: `"${data.title}" is now live. Emailed ${emailedCount}/${totalRelevantMembers} relevant members. (Simulated)`,
      });
      form.reset();
      router.push('/dashboard'); 
    } catch (e) {
        console.error("Failed to save announcement or simulate email:", e);
        toast({
            variant: "destructive",
            title: 'Error Publishing',
            description: `Could not save announcement. Please try again.`,
        });
    }
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
            Share important updates with your gym members. It will be visible on the dashboard.
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

    