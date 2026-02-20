
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { UserCheck, ScanLine, Loader2 } from 'lucide-react';

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
import { findMemberForCheckInAction, recordCheckInAction } from '@/app/actions/kiosk-actions';
import { QrScannerDialog } from './qr-scanner-dialog';

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID or QR code data is required.' }),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

interface CheckinFormProps {
  className?: string;
  onSuccessfulCheckin: (checkinEntry: FormattedCheckIn) => void;
}

export function CheckinForm({ className, onSuccessfulCheckin }: CheckinFormProps) {
  const { toast } = useToast();
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

    if (!currentGymDatabaseId || !currentKioskGymName) {
        toast({ variant: "destructive", title: "Kiosk Error", description: 'Kiosk configuration error. Please contact admin (Gym ID/Name missing).' });
        setIsProcessing(false);
        return;
    }

    const findMemberResponse = await findMemberForCheckInAction(data.identifier, currentGymDatabaseId);

    if (findMemberResponse.error || !findMemberResponse.member) {
      toast({ variant: "destructive", title: "Check-in Failed", description: findMemberResponse.error || 'Member not found or ID is invalid for this gym.' });
      setIsProcessing(false);
      return;
    }

    const member = findMemberResponse.member;

    if (member.membershipStatus === 'expired') {
      toast({ variant: "destructive", title: "Membership Expired", description: `Membership for ${member.name} is expired. Please see reception.` });
      setIsProcessing(false); return;
    }
    if (member.membershipStatus === 'inactive') {
      toast({ variant: "destructive", title: "Membership Inactive", description: `Hi ${member.name}, your membership is inactive. Please contact support.` });
      setIsProcessing(false); return;
    }
    if (member.membershipStatus === 'pending') {
      toast({ title: "Membership Pending", description: `Hi ${member.name}, your membership is pending. Please see reception.` });
      setIsProcessing(false); return;
    }

    const recordResponse = await recordCheckInAction(member.id, currentGymDatabaseId);
    if (!recordResponse.success || !recordResponse.checkInTime) {
        toast({ variant: "destructive", title: "Check-in Failed", description: recordResponse.error || "Failed to record check-in. You might already be checked in today." });
        setIsProcessing(false); return;
    }

    const actualCheckInTime = recordResponse.checkInTime;

    const formattedCheckinForDisplay: FormattedCheckIn = {
      checkInRecordId: recordResponse.checkInRecordId,
      memberTableId: member.id,
      memberName: member.name,
      memberId: member.memberId,
      checkInTime: new Date(actualCheckInTime),
      checkOutTime: null,
      createdAt: new Date(),
      gymName: currentKioskGymName,
    };
    onSuccessfulCheckin(formattedCheckinForDisplay);

    toast({
      title: "Check-in Recorded",
      description: `Member ${member.name} checked in successfully.`,
    });

    form.reset();
    setIsProcessing(false);
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
      <Card className={cn("w-full shadow-xl bg-card rounded-lg", className)}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground/90">Check-in Form</CardTitle>
          <CardDescription className="text-muted-foreground">Use the member's ID or QR code.</CardDescription>
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
                        placeholder="Enter member's ID" 
                        {...field} 
                        className="text-base h-auto py-4 px-4 bg-input text-foreground focus:ring-primary focus:ring-2 focus:border-primary" 
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
                    {isProcessing ? 'Checking In...' : 'Check In Member'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setIsQrScannerOpen(true)} 
                    className="w-full text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1" 
                    disabled={isProcessing || !currentGymDatabaseId}
                  >
                    <ScanLine className="mr-2 h-5 w-5" /> Scan QR Code
                  </Button>
              </div>
            </form>
          </Form>
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
