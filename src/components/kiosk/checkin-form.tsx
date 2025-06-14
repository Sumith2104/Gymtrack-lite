
'use client';

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LogIn, AlertTriangle, CheckCircle2, PartyPopper, ScanLine, CameraOff, XCircle } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, type Html5QrcodeError, type Html5QrcodeResult } from 'html5-qrcode';

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
import type { Member, FormattedCheckIn } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { findMemberForCheckInAction, recordCheckInAction } from '@/app/actions/kiosk-actions';
import { Skeleton } from '@/components/ui/skeleton';

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID or QR code data is required.' }),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

interface CheckinFormProps {
  className?: string;
  onSuccessfulCheckin: (checkinEntry: FormattedCheckIn) => void;
  todaysCheckins: FormattedCheckIn[]; // Used to prevent double check-in on client before server confirms
}

const QR_READER_ELEMENT_ID = "qr-reader-kiosk";

export function CheckinForm({ className, onSuccessfulCheckin, todaysCheckins }: CheckinFormProps) {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; quote?: string; memberName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKioskFormattedGymId, setCurrentKioskFormattedGymId] = useState<string | null>(null); // User facing Gym ID
  const [currentKioskGymName, setCurrentKioskGymName] = useState<string | null>(null);
  const [currentGymDatabaseId, setCurrentGymDatabaseId] = useState<string | null>(null); // Actual DB UUID of the gym

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentKioskFormattedGymId(localStorage.getItem('gymId'));
      setCurrentKioskGymName(localStorage.getItem('gymName'));
      setCurrentGymDatabaseId(localStorage.getItem('gymDatabaseId'));
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
        setCheckinStatus({ type: 'error', message: 'Kiosk configuration error. Please contact admin.' });
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

    if (isAlreadyCheckedInToday(member.id)) { // Client-side quick check
      setCheckinStatus({ type: 'info', message: `${member.name}, you are already checked in today.` });
      setIsLoading(false); return;
    }
    
    // Attempt to record check-in
    const recordResponse = await recordCheckInAction(member.id, currentGymDatabaseId);
    if (!recordResponse.success || !recordResponse.checkInTime) {
        setCheckinStatus({ type: 'error', message: recordResponse.error || "Failed to record check-in. Member might already be checked in today." });
        setIsLoading(false); return;
    }

    try {
      const quoteInput: MotivationalQuoteInput = { memberId: member.memberId, memberName: member.name };
      const motivation = await generateMotivationalQuote(quoteInput);
      
      if (member.email) {
        console.log(`SIMULATING: Email confirmation sent to ${member.email} for successful check-in. Quote: "${motivation.quote}"`);
      }
      
      const formattedCheckinForDisplay: FormattedCheckIn = {
        memberTableId: member.id,
        memberName: member.name,
        memberId: member.memberId,
        checkInTime: new Date(recordResponse.checkInTime), // Use actual check-in time from DB
        gymName: currentKioskGymName, 
      };
      onSuccessfulCheckin(formattedCheckinForDisplay);
      
      setCheckinStatus({ 
        type: 'success', 
        message: `Welcome, ${member.name}! Enjoy your workout.`,
        quote: motivation.quote,
        memberName: member.name,
      });

    } catch (error) {
      console.error("Failed to generate motivational quote:", error);
      const fallbackQuote = "Keep pushing your limits!";
      const formattedCheckinForDisplayOnError: FormattedCheckIn = {
        memberTableId: member.id,
        memberName: member.name,
        memberId: member.memberId,
        checkInTime: new Date(recordResponse.checkInTime!), // Use actual time
        gymName: currentKioskGymName,
      };
      onSuccessfulCheckin(formattedCheckinForDisplayOnError);
      setCheckinStatus({ type: 'success', message: `Welcome, ${member.name}! Enjoy your workout.`, quote: fallbackQuote, memberName: member.name });
      if (member.email) console.log(`SIMULATING: Email confirmation sent to ${member.email} (with fallback quote).`);
    } finally {
      form.reset(); 
      setIsLoading(false);
      setTimeout(() => setCheckinStatus(null), 10000);
    }
  }

  const onScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
    form.setValue('identifier', decodedText);
    toast({ title: "QR Code Scanned", description: `Member ID ${decodedText} captured. Processing...` });
    handleCancelScan(); 
    setTimeout(() => { form.handleSubmit(onSubmit)(); }, 200); 
  };

  const onScanFailure = (error: Html5QrcodeError | string) => { /* Usually ignore "QR code not found" */ };

  useEffect(() => {
    if (isScanning && !html5QrCodeScannerRef.current) {
      setCameraError(null);
      try {
        const scanner = new Html5QrcodeScanner(
          QR_READER_ELEMENT_ID,
          { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE], rememberLastUsedCamera: true, },
          false 
        );
        scanner.render(onScanSuccess, onScanFailure);
        html5QrCodeScannerRef.current = scanner;
      } catch (err: any) {
        console.error("Failed to initialize QR Scanner:", err);
        setCameraError(err.message || "Failed to initialize camera/scanner.");
        setIsScanning(false); 
      }
    }
    return () => {
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(error => console.error("Failed to clear html5QrCodeScanner.", error));
        html5QrCodeScannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  const handleScanQrCodeClick = () => { setIsScanning(true); setCheckinStatus(null); };
  const handleCancelScan = () => {
    if (html5QrCodeScannerRef.current) {
      html5QrCodeScannerRef.current.clear().catch(error => console.error("Failed to clear html5QrCodeScanner on cancel.", error));
      html5QrCodeScannerRef.current = null;
    }
    setIsScanning(false); setCameraError(null);
  };

  if (isScanning) {
    return (
      <Card className={cn("w-full shadow-2xl", className)}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Scan QR Code</CardTitle>
          <CardDescription>Point your QR code at the camera.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id={QR_READER_ELEMENT_ID} className="w-full aspect-square bg-muted rounded-md border border-border overflow-hidden"></div>
          {cameraError && (
            <Alert variant="destructive"><CameraOff className="mr-2 h-4 w-4" /><AlertTitle>Camera/Scanner Problem</AlertTitle><AlertDescription>{cameraError}</AlertDescription></Alert>
          )}
          {!cameraError && <div className="text-center text-muted-foreground text-sm">Initializing scanner... If prompted, please allow camera access.</div>}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCancelScan} className="w-full"><XCircle className="mr-2 h-5 w-5" /> Cancel Scan</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
                <Button type="button" onClick={handleScanQrCodeClick} className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentGymDatabaseId}>
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
  );
}
