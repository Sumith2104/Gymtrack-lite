
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { UserCheck, ScanLine, Loader2, AlertTriangle } from 'lucide-react'; // Removed CheckCircle2, PartyPopper

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
import type { FormattedCheckIn } from '@/lib/types';
import { cn } from '@/lib/utils';
import { findMemberForCheckInAction, recordCheckInAction, sendCheckInEmailAction } from '@/app/actions/kiosk-actions';
// Removed: import { generateMotivationalQuote, type MotivationalQuoteInput } from '@/ai/flows/generate-motivational-quote';
import { QrScannerDialog } from './qr-scanner-dialog';

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID or QR code data is required.' }),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

interface CheckinStatus { // Simplified state type if success details are no longer stored here
  type: 'error' | 'info';
  message: string;
}

interface CheckinFormProps {
  className?: string;
  onSuccessfulCheckin: (checkinEntry: FormattedCheckIn) => void;
}

export function CheckinForm({ className, onSuccessfulCheckin }: CheckinFormProps) {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentGymDatabaseId, setCurrentGymDatabaseId] = useState<string | null>(null);
  const [currentKioskGymName, setCurrentKioskGymName] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

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

  async function onSubmit(data: CheckinFormValues) {
    setIsProcessing(true);
    setCheckinStatus(null);

    if (!currentGymDatabaseId || !currentKioskGymName) {
        setCheckinStatus({ type: 'error', message: 'Kiosk configuration error. Please contact admin (Gym ID/Name missing).' });
        setIsProcessing(false);
        return;
    }

    const findMemberResponse = await findMemberForCheckInAction(data.identifier, currentGymDatabaseId);

    if (findMemberResponse.error || !findMemberResponse.member) {
      setCheckinStatus({ type: 'error', message: findMemberResponse.error || 'Member not found or ID is invalid for this gym.' });
      setIsProcessing(false);
      return;
    }

    const member = findMemberResponse.member;

    if (member.membershipStatus === 'expired') {
      setCheckinStatus({ type: 'error', message: `Membership for ${member.name} is expired. Please see reception.` });
      setIsProcessing(false); return;
    }
    if (member.membershipStatus === 'inactive') {
      setCheckinStatus({ type: 'error', message: `Hi ${member.name}, your membership is inactive. Please contact support.` });
      setIsProcessing(false); return;
    }
    if (member.membershipStatus === 'pending') {
      setCheckinStatus({ type: 'info', message: `Hi ${member.name}, your membership is pending. Please see reception.` });
      setIsProcessing(false); return;
    }

    const recordResponse = await recordCheckInAction(member.id, currentGymDatabaseId);
    if (!recordResponse.success || !recordResponse.checkInTime) {
        setCheckinStatus({ type: 'error', message: recordResponse.error || "Failed to record check-in. You might already be checked in today." });
        setIsProcessing(false); return;
    }

    const actualCheckInTime = recordResponse.checkInTime;

    // AI Quote generation removed from here

    if (member.email && currentKioskGymName) {
        const emailResponse = await sendCheckInEmailAction(member, actualCheckInTime, currentKioskGymName);
        // console.log("Check-in email status:", emailResponse.message);
    }

    const formattedCheckinForDisplay: FormattedCheckIn = {
      checkInRecordId: recordResponse.checkInRecordId, // Assuming recordCheckInAction returns this
      memberTableId: member.id,
      memberName: member.name,
      memberId: member.memberId,
      checkInTime: new Date(actualCheckInTime),
      checkOutTime: null, // Check-out time not known at check-in
      createdAt: new Date(), // Assuming createdAt is now for this new check-in record
      gymName: currentKioskGymName,
    };
    onSuccessfulCheckin(formattedCheckinForDisplay);

    // Replaced complex setCheckinStatus with a simple toast
    toast({
      title: "Check-in Recorded",
      description: `Member ${member.name} checked in successfully.`,
    });

    form.reset();
    setIsProcessing(false);
    setTimeout(() => setCheckinStatus(null), 10000); // Clear error/info status message after 10 seconds
  }

  const handleScanSuccess = (decodedText: string) => {
    form.setValue('identifier', decodedText);
    toast({ title: "QR Code Scanned", description: `Member ID ${decodedText} captured. Processing...` });
    setIsQrScannerOpen(false);
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
      <Card className={cn("w-full shadow-xl bg-card border-border rounded-lg", className)}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground/90">Check-in Form</CardTitle>
          <CardDescription className="text-muted-foreground">Use your Member ID or QR code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 text-lg">Member ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your Member ID" 
                        {...field} 
                        className="text-base h-auto py-6 px-4 bg-input text-foreground focus:ring-primary focus:ring-2 focus:border-primary" 
                        autoFocus 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    type="submit" 
                    className="w-full text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1" 
                    disabled={isProcessing || !currentGymDatabaseId}
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserCheck className="mr-2 h-5 w-5" />}
                    {isProcessing ? 'Signing In...' : 'Sign In'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => { setCheckinStatus(null); setIsQrScannerOpen(true);}} 
                    className="w-full text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1" 
                    disabled={isProcessing || !currentGymDatabaseId}
                  >
                    <ScanLine className="mr-2 h-5 w-5" /> Scan QR Code
                  </Button>
              </div>
            </form>
          </Form>

          {/* Display card only for error or info messages */}
          {checkinStatus && (checkinStatus.type === 'error' || checkinStatus.type === 'info') && (
            <Card className={`mt-6 ${checkinStatus.type === 'error' ? 'border-red-500/50' : 'border-blue-500/50'} bg-card/80`}>
              <CardContent className="p-6 text-center">
                {checkinStatus.type === 'error' && <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3" />}
                {checkinStatus.type === 'info' && <AlertTriangle className="mx-auto h-12 w-12 text-blue-500 mb-3" />}
                <p className={`text-xl font-semibold ${checkinStatus.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                  {checkinStatus.message}
                </p>
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
