
'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Mail, Send, Info, CheckSquare, Square } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import type { Member } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const emailSchema = z.object({
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }).max(100),
  body: z.string().min(10, { message: 'Email body must be at least 10 characters.' }).max(2000),
  includeQrCode: z.boolean().default(false),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface BulkEmailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recipients: Member[];
  onSend: (subject: string, body: string, includeQrCode: boolean) => void;
}

export function BulkEmailDialog({ isOpen, onOpenChange, recipients, onSend }: BulkEmailDialogProps) {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: '',
      body: '',
      includeQrCode: false,
    },
  });

  const recipientCount = recipients.length;
  const isSingleRecipient = recipientCount === 1;

  useEffect(() => { 
    if (isOpen) {
      if (!isSingleRecipient) {
        form.setValue('includeQrCode', false);
      }
    } else {
        form.reset(); 
    }
  }, [isSingleRecipient, isOpen, form]);


  async function onSubmit(data: EmailFormValues) {
    onSend(data.subject, data.body, data.includeQrCode && isSingleRecipient); 
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) form.reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center font-headline">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email to {recipientCount} selected member(s).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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

            {isSingleRecipient && (
              <FormField
                control={form.control}
                name="includeQrCode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-3 shadow-sm bg-muted/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isSingleRecipient}
                        id="includeQrCode"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="includeQrCode" className="font-medium cursor-pointer text-foreground/80">
                        Include Member ID QR Code for Check-in
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}
            
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
