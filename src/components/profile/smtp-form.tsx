
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Save } from 'lucide-react';
import { getGymSmtpSettings, updateGymSmtpSettings } from '@/app/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { PasswordInput } from '../ui/password-input';

const smtpFormSchema = z.object({
  app_email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  app_pass: z.string().optional().nullable(),
});

type SmtpFormValues = z.infer<typeof smtpFormSchema>;

export function SmtpForm() {
  const { toast } = useToast();
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpFormSchema),
    defaultValues: {
      app_email: '',
      app_pass: '',
    },
  });

  useEffect(() => {
    const dbId = localStorage.getItem('gymDatabaseId');
    setGymDatabaseId(dbId);
  }, []);

  useEffect(() => {
    if (gymDatabaseId) {
      setIsLoading(true);
      getGymSmtpSettings(gymDatabaseId).then((response) => {
        if (response.error) {
          toast({ variant: 'destructive', title: 'Error Fetching SMTP Settings', description: response.error });
        }
        if (response.data) {
          // Do not display the password.
          form.reset({
            app_email: response.data.app_email,
            app_pass: '', // Always keep password field blank on load
          });
        }
        setIsLoading(false);
      });
    } else {
        setIsLoading(false);
    }
  }, [gymDatabaseId, form, toast]);

  async function onSubmit(data: SmtpFormValues) {
    if (!gymDatabaseId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gym ID not found.' });
      return;
    }

    const response = await updateGymSmtpSettings(gymDatabaseId, data);

    if (response.success) {
      toast({ title: 'Success', description: 'SMTP settings updated successfully.' });
      // Clear password field from form state after successful submission
       if (data.app_pass) {
          form.reset({ ...data, app_pass: '' });
       }
    } else {
      toast({ variant: 'destructive', title: 'Error updating SMTP settings', description: response.error });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-foreground flex items-center mb-2">
          <Mail className="mr-2 h-4 w-4 text-primary" /> SMTP (Email Sending) Settings
        </h4>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  return (
    <div>
       <h4 className="font-medium text-foreground flex items-center mb-2">
          <Mail className="mr-2 h-4 w-4 text-primary" /> SMTP (Email Sending) Settings
      </h4>
      <p className="text-sm text-muted-foreground mb-4">Configure your own email server to send emails to members. 'From' address will be same as username. Leave fields blank to use the system default.</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="app_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP Username/Email</FormLabel>
                  <FormControl><Input placeholder="your-email@example.com" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="app_pass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP App Password</FormLabel>
                  <FormControl><PasswordInput placeholder="Enter new password to update" {...field} value={field.value ?? ''} /></FormControl>
                  <FormDescription>Leave this field blank to keep your current password.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? 'Saving...' : 'Save SMTP Settings'}
            </Button>
          </form>
        </Form>
    </div>
  );
}
