
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LogIn, AlertTriangle, CheckCircle2, PartyPopper, ScanLine, XCircle } from 'lucide-react';

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
import type { Member, FormattedCheckIn } from '@/lib/types';
import { cn } from '@/lib/utils';
import { findMemberForCheckInAction, recordCheckInAction, sendCheckInEmailAction } from '@/app/actions/kiosk-actions';
import { generateMotivationalQuote, type MotivationalQuoteInput } from '@/ai/flows/generate-motivational-quote';
import { Skeleton } from '@/components/ui/skeleton';
import { QrScannerDialog } from './qr-scanner-dialog'; // Added import

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID or QR code data is required.' }),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

interface CheckinFormProps {
  className?: string;
  onSuccessfulCheckin: (checkinEntry: FormattedCheckIn) => void;
  todaysCheckins: FormattedCheckIn[];
}

export function CheckinForm({ className, onSuccessfulCheckin, todaysCheckins }: CheckinFormProps) {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; quote?: string; memberName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGymDatabaseId, setCurrentGymDatabaseId] = useState<string | null>(null);
  const [currentKioskGymName, setCurrentKioskGymName] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false); // Added state for QR scanner dialog

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentGymDatabaseId(localStorage.getItem('gymDatabaseId'));
      setCurrentKioskGymName(localStorage.getItem('gymName'));
    }
  }, []);

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      identifier: '',
    },
  });

  const isAlreadyCheckedInToday = (memberDbId: string): boolean => {
    return todaysCheckins.some(ci => ci.memberTableId === memberDbId);
  };

  async function onSubmit(data: CheckinFormValues) {
    setIsLoading(true);
    setCheckinStatus(null);

    if (!currentGymDatabaseId || !currentKioskGymName) {
        setCheckinStatus({ type: 'error', message: 'Kiosk configuration error. Please contact admin (Gym ID/Name missing).' });
        setIsLoading(false);
        return;
    }

    const findMemberResponse = await findMemberForCheckInAction(data.identifier, currentGymDatabaseId);

    if (findMemberResponse.error || !findMemberResponse.member) {
      setCheckinStatus({ type: 'error', message: findMemberResponse.error || 'Member not found for this gym or ID is invalid.' });
      setIsLoading(false);
      return;
    }

    const member = findMemberResponse.member;

    if (member.membershipStatus === 'expired') {
      setCheckinStatus({ type: 'error', message: `Membership for ${member.name} is expired. Please see reception.` });
      setIsLoading(false); return;
    }
    if (member.membershipStatus === 'inactive') {
      setCheckinStatus({ type: 'error', message: `Hi ${member.name}, your membership is inactive. Please contact support.` });
      setIsLoading(false); return;
    }
    if (member.membershipStatus === 'pending') {
      setCheckinStatus({ type: 'info', message: `Hi ${member.name}, your membership is pending. Please see reception.` });
      setIsLoading(false); return;
    }

    if (isAlreadyCheckedInToday(member.id)) {
      setCheckinStatus({ type: 'info', message: `${member.name}, you are already checked in today.` });
      setIsLoading(false); return;
    }

    const recordResponse = await recordCheckInAction(member.id, currentGymDatabaseId);
    if (!recordResponse.success || !recordResponse.checkInTime) {
        setCheckinStatus({ type: 'error', message: recordResponse.error || "Failed to record check-in. Member might already be checked in today." });
        setIsLoading(false); return;
    }

    const actualCheckInTime = recordResponse.checkInTime;

    let quote = "Keep pushing your limits!";
    try {
      const quoteInput: MotivationalQuoteInput = { memberId: member.memberId, memberName: member.name };
      const motivation = await generateMotivationalQuote(quoteInput);
      if (motivation.quote) quote = motivation.quote;
    } catch (error) {
      console.error("Failed to generate motivational quote:", error);
    }

    if (member.email && currentKioskGymName) {
        const emailResponse = await sendCheckInEmailAction(member, actualCheckInTime, currentKioskGymName);
        console.log("Check-in email status:", emailResponse.message);
    }

    const formattedCheckinForDisplay: FormattedCheckIn = {
      memberTableId: member.id,
      memberName: member.name,
      memberId: member.memberId,
      checkInTime: new Date(actualCheckInTime),
      gymName: currentKioskGymName,
    };
    onSuccessfulCheckin(formattedCheckinForDisplay);

    setCheckinStatus({
      type: 'success',
      message: `Welcome, ${member.name}! Enjoy your workout.`,
      quote: quote,
      memberName: member.name,
    });

    form.reset();
    setIsLoading(false);
    setTimeout(() => setCheckinStatus(null), 10000);
  }

  const handleScanSuccess = (decodedText: string) => {
    form.setValue('identifier', decodedText);
    toast({ title: "QR Code Scanned", description: `Member ID ${decodedText} captured. Processing...` });
    setIsQrScannerOpen(false);
    // Auto-submit the form after a short delay to allow UI to update
    setTimeout(() => {
      form.handleSubmit(onSubmit)();
    }, 200);
  };

  const handleScanError = (errorMessage: string) => {
    toast({ variant: 'destructive', title: "QR Scan Error", description: errorMessage });
    setIsQrScannerOpen(false);
  };


  return (
    <>
      <Card className={cn("w-full shadow-2xl", className)}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Member Check-in</CardTitle>
          <CardDescription>Enter Member ID or Scan QR</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && !checkinStatus ?
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </div>
              :
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-left">Member ID / QR Data</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Member ID or scan QR" {...field} className="text-base h-11" autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentGymDatabaseId}>
                      <LogIn className="mr-2 h-5 w-5" /> Sign In
                  </Button>
                  <Button type="button" onClick={() => { setCheckinStatus(null); setIsQrScannerOpen(true);}} className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentGymDatabaseId}>
                      <ScanLine className="mr-2 h-5 w-5" /> Scan QR Code
                  </Button>
              </div>
            </form>
          </Form>
          }

          {checkinStatus && (
            <Card className={`mt-6 ${ checkinStatus.type === 'success' ? 'border-green-500' : checkinStatus.type === 'error' ? 'border-red-500' : 'border-blue-500'} bg-card/80`}>
              <CardContent className="p-6 text-center">
                {checkinStatus.type === 'success' && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />}
                {checkinStatus.type === 'error' && <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3" />}
                {checkinStatus.type === 'info' && <AlertTriangle className="mx-auto h-12 w-12 text-blue-500 mb-3" />}
                <p className={`text-xl font-semibold ${ checkinStatus.type === 'success' ? 'text-green-400' : checkinStatus.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                  {checkinStatus.message}
                </p>
                {checkinStatus.quote && checkinStatus.type === 'success' && (
                  <div className="mt-4 pt-4 border-t border-border/50">
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
      <QrScannerDialog
        isOpen={isQrScannerOpen}
        onOpenChange={setIsQrScannerOpen}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
      />
    </>
  );
}
