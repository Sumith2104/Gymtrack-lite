
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Mail, Send, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { Member } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const emailSchema = z.object({
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }).max(100),
  body: z.string().min(10, { message: 'Email body must be at least 10 characters.' }).max(2000),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface BulkEmailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recipients: Member[];
  onSend: (subject: string, body: string) => void;
}

export function BulkEmailDialog({ isOpen, onOpenChange, recipients, onSend }: BulkEmailDialogProps) {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: '',
      body: '',
    },
  });

  const recipientCount = recipients.length;
  const isSingleRecipient = recipientCount === 1;

  async function onSubmit(data: EmailFormValues) {
    onSend(data.subject, data.body);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) form.reset(); // Reset form if dialog is closed
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center font-headline">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            Compose Bulk Email
          </DialogTitle>
          <DialogDescription>
            Send an email to {recipientCount} selected member(s).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {isSingleRecipient && (
                 <Alert className="border-primary/50 bg-primary/5">
                    <Info className="h-4 w-4 !text-primary" />
                    <AlertTitle className="text-primary/90">Note for Single Recipient</AlertTitle>
                    <AlertDescription className="text-primary/80">
                        The member's QR code for check-in can be included in this email (simulated).
                    </AlertDescription>
                </Alert>
            )}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Important Gym Update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Body</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dear member, ..."
                      className="resize-none min-h-[150px]"
                      rows={7}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Sending...' : <><Send className="mr-2 h-4 w-4" /> Send Email</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
