'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { QrCode, Fingerprint, AlertTriangle, CheckCircle2, PartyPopper } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import { generateMotivationalQuote, type MotivationalQuoteInput } from '@/ai/flows/generate-motivational-quote';
import type { Member, CheckIn } from '@/lib/types';

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID is required.' }),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

// Mock members data for kiosk - aligned with new Member type
const mockKioskMembers: Member[] = [
  { id: 'member-uuid-1', memberId: 'MBR001', name: 'Alice Johnson', email: 'alice@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', membershipStatus: 'expired', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', membershipStatus: 'inactive', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-4', memberId: 'MBR004', name: 'Valid Member', email: 'valid@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'GYM_OTHER' }, // Belongs to a different gym
];

export function CheckinForm() {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; quote?: string; memberName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      identifier: '',
    },
  });

  async function onSubmit(data: CheckinFormValues) {
    setIsLoading(true);
    setCheckinStatus(null); 
    
    // Simulate API call & QR decoding (if QR codes were implemented with memberId)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const currentKioskGymId = localStorage.getItem('gymId') || 'GYM123_default'; // Get current gym ID for the kiosk

    // Find member by memberId. QR codes would typically encode the memberId.
    const member = mockKioskMembers.find(m => 
        m.memberId.toLowerCase() === data.identifier.toLowerCase() && 
        m.gymId === currentKioskGymId // Ensure member belongs to the current gym
    );

    if (!member) {
      setCheckinStatus({ type: 'error', message: 'Member not found for this gym or ID is invalid.' });
      setIsLoading(false);
      return;
    }

    if (member.membershipStatus === 'expired') {
      setCheckinStatus({ type: 'error', message: `Hi ${member.name}, your membership has expired. Please see reception.` });
      setIsLoading(false);
      return;
    }

    if (member.membershipStatus === 'inactive') {
      setCheckinStatus({ type: 'error', message: `Hi ${member.name}, your membership is inactive. Please contact support.` });
      setIsLoading(false);
      return;
    }
    
    if (member.membershipStatus === 'pending') {
      setCheckinStatus({ type: 'info', message: `Hi ${member.name}, your membership is pending. Please see reception.` });
      setIsLoading(false);
      return;
    }

    // Successful check-in
    try {
      const quoteInput: MotivationalQuoteInput = { memberId: member.memberId, memberName: member.name };
      const motivation = await generateMotivationalQuote(quoteInput);
      
      // Simulate creating a check-in record
      const newCheckIn: CheckIn = {
        id: `checkin_${Date.now()}`, // Mock ID
        gymId: member.gymId,
        memberTableId: member.id, // Link to the member's UUID
        checkInTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      console.log("Mock Check-In Record Created:", newCheckIn);
      
      setCheckinStatus({ 
        type: 'success', 
        message: `Welcome back, ${member.name}! You're checked in.`,
        quote: motivation.quote,
        memberName: member.name,
      });
      
      toast({
        title: `Welcome ${member.name}!`,
        description: `Checked in successfully. ${motivation.quote}`,
      });

    } catch (error) {
      console.error("Failed to generate motivational quote:", error);
      setCheckinStatus({ 
        type: 'success', 
        message: `Welcome back, ${member.name}! You're checked in.`,
        quote: "Keep pushing your limits!", 
        memberName: member.name,
      });
      toast({
        title: `Welcome ${member.name}!`,
        description: `Checked in successfully. Keep pushing your limits!`,
      });
    } finally {
      form.reset(); 
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-2xl">
      <CardHeader className="text-center">
         <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
          <QrCode className="h-10 w-10 text-primary-foreground" />
        </div>
        <CardTitle className="text-4xl font-headline">Gym Check-in Kiosk</CardTitle>
        <CardDescription>Enter your Member ID</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Member ID</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="Type Member ID..." 
                        {...field} 
                        className="pl-10 text-lg h-12"
                        autoFocus
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Check In'}
            </Button>
          </form>
        </Form>

        {checkinStatus && (
          <Card className={`mt-6 ${checkinStatus.type === 'success' ? 'border-green-500' : checkinStatus.type === 'error' ? 'border-red-500' : 'border-blue-500'} bg-card/50`}>
            <CardContent className="p-6 text-center">
              {checkinStatus.type === 'success' && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />}
              {checkinStatus.type === 'error' && <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3" />}
              {checkinStatus.type === 'info' && <AlertTriangle className="mx-auto h-12 w-12 text-blue-500 mb-3" />} {/* Example for info */}
              <p className={`text-xl font-semibold ${checkinStatus.type === 'success' ? 'text-green-400' : checkinStatus.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                {checkinStatus.message}
              </p>
              {checkinStatus.quote && checkinStatus.type === 'success' && (
                <div className="mt-4 pt-4 border-t border-border">
                  <PartyPopper className="mx-auto h-8 w-8 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Your motivation for today:</p>
                  <p className="text-lg font-medium text-primary italic">"{checkinStatus.quote}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
