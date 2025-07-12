
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { User, Phone, Mail, MapPin, Send, Building, Loader2 } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import { sendNewGymRequestEmailAction } from '@/app/actions/super-admin-actions';

const requestSchema = z.object({
  gymName: z.string().min(2, { message: 'Gym name must be at least 2 characters.' }),
  ownerName: z.string().min(2, { message: 'Owner name must be at least 2 characters.' }),
  phone: z.string().min(10, { message: 'A valid phone number is required.' }),
  email: z.string().email({ message: 'A valid email address is required.' }),
  city: z.string().min(2, { message: 'City is required.' }),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export function RequestGymDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      gymName: '',
      ownerName: '',
      phone: '',
      email: '',
      city: '',
    },
  });

  async function onSubmit(data: RequestFormValues) {
    const response = await sendNewGymRequestEmailAction(data);

    if (response.success) {
      toast({
        title: "Request Sent!",
        description: "Your request has been sent to the admin. We will contact you shortly.",
      });
      form.reset();
      setOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: response.error || "Could not send your request. Please try again.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 font-normal h-auto py-0">
          Request to create a new gym
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request New Gym Account</DialogTitle>
          <DialogDescription>
            Fill out the form below. Our team will review your request and get in touch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="gymName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4" />Gym Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Steel Fitness" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" />Owner Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" />Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4" />Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+91 12345 67890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4" />City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mumbai" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send Request</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
