
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
import type { Announcement } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { Megaphone, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';


const announcementSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).max(1000),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;


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

  async function onSubmit(data: AnnouncementFormValues) {
    const gymDatabaseId = localStorage.getItem('gymDatabaseId') || 'default_gym_db_id_mock'; // Actual Gym UUID
    
    const newAnnouncement: Announcement = {
      id: `announcement_page_${Date.now()}`, // Mock UUID
      title: data.title,
      content: data.content,
      createdAt: new Date().toISOString(),
      gymId: gymDatabaseId, 
    };

    try {
      const existingAnnouncementsRaw = localStorage.getItem('gymAnnouncements');
      const existingAnnouncements: Announcement[] = existingAnnouncementsRaw ? JSON.parse(existingAnnouncementsRaw) : [];
      localStorage.setItem('gymAnnouncements', JSON.stringify([newAnnouncement, ...existingAnnouncements]));
      window.dispatchEvent(new Event('storage')); // Notify other parts of the app

      toast({
        title: 'Announcement Published',
        description: `"${data.title}" is now live. (Simulated)`,
      });
      form.reset();
      router.push('/dashboard'); // Redirect to dashboard after successful creation
    } catch (e) {
        console.error("Failed to save announcement to localStorage:", e);
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
