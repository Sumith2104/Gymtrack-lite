'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, Shield, LogIn } from 'lucide-react';

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


const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  gymId: z.string().min(1, { message: 'Gym ID is required.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
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
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    // Mock authentication
    if (data.email === 'owner@example.com' && data.gymId === 'GYM123' && data.password === 'password') {
      // Simulate successful login
      // In a real app, you'd set a token in localStorage/cookie and manage auth state.
      localStorage.setItem('isAuthenticated', 'true'); // Mock auth state
      localStorage.setItem('gymId', data.gymId);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
      });
      form.setError('root', { message: 'Invalid credentials.' });
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
                    <Mail className="mr-2 h-4 w-4 text-primary" /> Email Address
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <KeyRound className="mr-2 h-4 w-4 text-primary" /> Password
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
