
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
import type { Gym } from '@/lib/types';

// Mock gyms data - in a real app, this would come from your Supabase backend
const MOCK_GYMS: Gym[] = [
  {
    id: 'd3b2ded3-42ec-4906-846a-21d3e7130d78', // From screenshot
    name: 'ast', // From screenshot
    ownerEmail: 'sumithsumith4567890@gmail.com', // From screenshot
    formattedGymId: 'UOFIPOIB', // From screenshot
    createdAt: '2025-06-12T08:51:07.380Z', // Approximate from screenshot
    status: 'active', // From screenshot
    ownerUserId: null // From screenshot
  },
  {
    id: 'gym_uuid_1',
    name: 'Fitness Central',
    ownerEmail: 'owner@example.com',
    formattedGymId: 'GYM123',
    createdAt: new Date().toISOString(),
    status: 'active',
    ownerUserId: 'owner_user_uuid_1'
  },
  {
    id: 'gym_uuid_2',
    name: 'Iron Paradise',
    ownerEmail: 'gymadmin@example.org',
    formattedGymId: 'GYMXYZ',
    createdAt: new Date().toISOString(),
    status: 'active',
    ownerUserId: 'owner_user_uuid_2'
  },
];

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
    // Mock passwordless authentication for gym owner
    const targetGym = MOCK_GYMS.find(gym => gym.formattedGymId.toLowerCase() === data.gymId.toLowerCase() && gym.ownerEmail.toLowerCase() === data.email.toLowerCase());

    if (targetGym) {
      // Simulate successful magic link authentication (or similar passwordless flow)
      localStorage.setItem('isAuthenticated', 'true'); // Mock auth state
      localStorage.setItem('gymId', targetGym.formattedGymId); // Store formattedGymId
      localStorage.setItem('gymOwnerEmail', targetGym.ownerEmail);
      localStorage.setItem('gymName', targetGym.name); // Store gym name
      localStorage.setItem('gymDatabaseId', targetGym.id); // Store actual gym UUID

      toast({
        title: "Check Your Email",
        description: `A login link has been sent to ${data.email}. Please click it to sign in. (Simulated)`,
      });
      // In a real magic link flow, user would click link from email. Here we'll auto-redirect for mock.
      // For demo purposes, we'll proceed as if the link was clicked.
      setTimeout(() => {
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push('/dashboard');
      }, 2000);

    } else {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Invalid Gym ID or Email. Please check your details. (Simulated)",
      });
      form.setError('root', { message: 'Invalid Gym ID or Email.' });
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
              {form.formState.isSubmitting ? 'Processing...' : 'Login with Email Link'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
