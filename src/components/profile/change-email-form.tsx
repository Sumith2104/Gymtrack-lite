
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AtSign, Save, Edit } from 'lucide-react';
import { updateOwnerEmail } from '@/app/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';

const emailFormSchema = z.object({
  newEmail: z.string().email({ message: 'Please enter a valid email address.' }),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export function ChangeEmailForm() {
  const { toast } = useToast();
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string>('');

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { newEmail: '' },
  });

  useEffect(() => {
    const dbId = localStorage.getItem('gymDatabaseId');
    setGymDatabaseId(dbId);
    const email = localStorage.getItem('gymOwnerEmail');
    if (email) {
      setCurrentEmail(email);
      form.setValue('newEmail', email);
    }
    setIsLoading(false);
  }, [form]);

  async function onSubmit(data: EmailFormValues) {
    if (!gymDatabaseId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gym ID not found.' });
      return;
    }

    const response = await updateOwnerEmail(gymDatabaseId, data.newEmail.trim());

    if (response.success) {
      toast({ title: 'Success', description: 'Owner email updated successfully.' });
      setCurrentEmail(data.newEmail.trim());
      localStorage.setItem('gymOwnerEmail', data.newEmail.trim()); // Update local storage
      setIsEditing(false);
    } else {
      toast({ variant: 'destructive', title: 'Error updating email', description: response.error });
    }
  }

  const handleCancelEdit = () => {
    form.reset({ newEmail: currentEmail });
    setIsEditing(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (isEditing) {
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Owner Email</FormLabel>
                  <FormControl>
                    <Input placeholder="new-owner@example.com" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? 'Saving...' : 'Save Email'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                </Button>
            </div>
          </form>
        </Form>
      );
    }

    return (
        <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/30">
            <p className="text-sm text-foreground font-mono truncate" title={currentEmail}>
            {currentEmail || 'No owner email set.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </Button>
      </div>
    );
  };

  return (
    <div>
      <h4 className="font-medium text-foreground flex items-center mb-2">
          <AtSign className="mr-2 h-4 w-4 text-primary" /> Owner Email
      </h4>
      <p className="text-sm text-muted-foreground mb-4">Change the primary email address for the gym owner.</p>
      {renderContent()}
    </div>
  );
}
