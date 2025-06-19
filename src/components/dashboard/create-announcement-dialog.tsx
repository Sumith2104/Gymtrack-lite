'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Announcement } from '@/lib/types';

const announcementSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).max(1000),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface CreateAnnouncementDialogProps {
  onAnnouncementCreated: (announcement: Announcement) => void;
}

export function CreateAnnouncementDialog({ onAnnouncementCreated }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  async function onSubmit(data: AnnouncementFormValues) {
    const gymIdentifier = localStorage.getItem('gymId') || 'GYM123_default'; 
    
    const newAnnouncement: Announcement = {
      id: `announcement_${Date.now()}`, 
      title: data.title,
      content: data.content,
      createdAt: new Date().toISOString(),
      gymId: gymIdentifier, 
      formattedGymId: gymIdentifier,
    };
    onAnnouncementCreated(newAnnouncement);
    toast({
      title: 'Announcement Published',
      description: `"${data.title}" is now live. (Simulated)`,
    });
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Create New Announcement</DialogTitle>
          <DialogDescription>
            Compose and publish an announcement for your gym members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                      className="resize-none"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Publishing...' : 'Publish'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
