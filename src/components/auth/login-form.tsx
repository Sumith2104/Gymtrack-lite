
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Mail, Shield, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { verifyGymOwnerCredentials } from '@/app/auth/actions';
import type { Gym } from '@/lib/types';
import { RequestGymDialog } from './request-gym-dialog';
import { Separator } from '../ui/separator';


const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  gymId: z.string().min(1, { message: 'Gym ID is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      gymId: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    form.clearErrors('root'); // Clear previous root errors
    const result = await verifyGymOwnerCredentials(data.email, data.gymId);

    if (typeof result === 'object' && result !== null) {
      const targetGym = result;
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('gymId', targetGym.formattedGymId);
      localStorage.setItem('gymOwnerEmail', targetGym.ownerEmail);
      localStorage.setItem('gymName', targetGym.name);
      localStorage.setItem('gymDatabaseId', targetGym.id);
      if (targetGym.ownerUserId) {
        localStorage.setItem('gymOwnerAuthId', targetGym.ownerUserId);
      } else {
        // It's possible ownerUserId might be null, handle this case if necessary
        // For now, if it's null, gymOwnerAuthId won't be set, and message sending might fail gracefully later
        console.warn("Owner User ID is null for this gym. Admin messaging might be affected.");
        localStorage.removeItem('gymOwnerAuthId'); // Ensure it's cleared if null
      }
      if (targetGym.sessionTimeHours) {
        localStorage.setItem('gymSessionTimeHours', String(targetGym.sessionTimeHours));
      }
      if (targetGym.maxCapacity) {
        localStorage.setItem('gymMaxCapacity', String(targetGym.maxCapacity));
      }


      if (targetGym.status === 'inactive soon') {
        localStorage.setItem('showInactiveSoonToast', 'true');
      }

      if (!targetGym.payment_id) {
        localStorage.setItem('showUpiToast', 'true');
      }

      toast({
        title: `Login successful for ${targetGym.name}`,
        description: "Redirecting to dashboard",
      });
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } else if (result === 'inactive') {
      toast({
        variant: "destructive",
        title: "Account Inactive",
        description: "This gym account is inactive. Please contact an admin.",
      });
      form.setError('root', { message: "This gym account is inactive. Please contact an admin." });
    } else { // 'not_found'
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Invalid Gym ID or Email. Please check your details.",
      });
      form.setError('root', { message: 'Invalid Gym ID or Email. Please try again.' });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
          <LogIn className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-3xl font-headline">GymTrack Lite Login</CardTitle>
        <CardDescription>Access your gym owner dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-primary" /> Owner Email Address
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="owner@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gymId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Shield className="mr-2 h-4 w-4 text-primary" /> Gym ID
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="GYM123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
             <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Processing...' : 'Login'}
            </Button>
          </form>
        </Form>
        <Separator className="my-6" />
        <div className="text-center">
          <RequestGymDialog />
        </div>
      </CardContent>
    </Card>
  );
}
