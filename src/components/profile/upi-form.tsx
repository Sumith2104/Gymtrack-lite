
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Save, Edit } from 'lucide-react';
import { getGymUpiId, updateGymUpiId } from '@/app/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';

const upiFormSchema = z.object({
  upiId: z.string().refine((val) => val === '' || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val), {
    message: 'Invalid UPI ID format. It should be like "user@bank". Leave empty to clear.',
  }),
});

type UpiFormValues = z.infer<typeof upiFormSchema>;

export function UpiForm() {
  const { toast } = useToast();
  const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUpiId, setCurrentUpiId] = useState<string>('');

  const form = useForm<UpiFormValues>({
    resolver: zodResolver(upiFormSchema),
    defaultValues: { upiId: '' },
  });

  useEffect(() => {
    const dbId = localStorage.getItem('gymDatabaseId');
    setGymDatabaseId(dbId);
  }, []);

  useEffect(() => {
    if (gymDatabaseId) {
      setIsLoading(true);
      getGymUpiId(gymDatabaseId).then((response) => {
        const upiValue = response.upiId || '';
        if (response.upiId !== null) {
          form.setValue('upiId', upiValue);
          setCurrentUpiId(upiValue);
        } else {
          toast({ variant: 'destructive', title: 'Error Fetching UPI', description: response.error });
        }
        setIsLoading(false);
      });
    } else {
        setIsLoading(false);
    }
  }, [gymDatabaseId, form, toast]);

  async function onSubmit(data: UpiFormValues) {
    if (!gymDatabaseId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gym ID not found.' });
      return;
    }

    const response = await updateGymUpiId(gymDatabaseId, data.upiId.trim() || null);

    if (response.success) {
      toast({ title: 'Success', description: 'UPI ID updated successfully.' });
      setCurrentUpiId(data.upiId.trim());
      setIsEditing(false);
    } else {
      toast({ variant: 'destructive', title: 'Error updating UPI ID', description: response.error });
    }
  }

  const handleCancelEdit = () => {
    form.reset({ upiId: currentUpiId });
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
              name="upiId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UPI ID</FormLabel>
                  <FormControl>
                    <Input placeholder="your-upi-id@bank" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? 'Saving...' : 'Save'}
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
            <p className="text-sm text-foreground font-mono truncate" title={currentUpiId}>
            {currentUpiId || 'No UPI ID has been set.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </Button>
      </div>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Wallet className="mr-2 h-5 w-5 text-primary" /> Payment Details
        </CardTitle>
        <CardDescription>Add or update your UPI ID to receive payments from members.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
