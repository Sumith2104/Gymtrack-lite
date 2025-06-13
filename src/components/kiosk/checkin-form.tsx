
'use client';

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { QrCode, LogIn, AlertTriangle, CheckCircle2, PartyPopper, Video, XCircle, ScanLine, CameraOff } from 'lucide-react';
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
import type { Member, CheckIn, FormattedCheckIn } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID is required.' }),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

const mockKioskMembers: Member[] = [
  { id: 'member-uuid-1', memberId: 'MBR001', name: 'Alice Johnson', email: 'alice@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-2', memberId: 'MBR002', name: 'Bob Smith', email: 'bob@example.com', membershipStatus: 'expired', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-3', memberId: 'MBR003', name: 'Carol White', email: 'carol@example.com', membershipStatus: 'inactive', createdAt: new Date().toISOString(), gymId: 'GYM123_default' },
  { id: 'member-uuid-4', memberId: 'MBR004', name: 'Valid Member', email: 'valid@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'GYM_OTHER' },
  { id: 'member-uuid-sumith', memberId: 'SUMITH001', name: 'Sumith Test Kiosk', email: 'sumith.kiosk@example.com', membershipStatus: 'active', createdAt: new Date().toISOString(), gymId: 'UOFIPOIB' },
];

interface CheckinFormProps {
  className?: string;
  onSuccessfulCheckin?: (checkinEntry: FormattedCheckIn) => void;
}

const QR_READER_ELEMENT_ID = "qr-reader-kiosk";

export function CheckinForm({ className, onSuccessfulCheckin }: CheckinFormProps) {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; quote?: string; memberName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKioskGymId, setCurrentKioskGymId] = useState<string | null>(null);
  const [currentKioskGymName, setCurrentKioskGymName] = useState<string | null>(null);


  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentKioskGymId(localStorage.getItem('gymId') || 'GYM123_default');
      setCurrentKioskGymName(localStorage.getItem('gymName') || 'Default Gym');
    }
  }, []);

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      identifier: '',
    },
  });

  async function onSubmit(data: CheckinFormValues) {
    setIsLoading(true);
    setCheckinStatus(null);
    
    if (!currentKioskGymId) {
        setCheckinStatus({ type: 'error', message: 'Kiosk configuration error. Please contact admin.' });
        setIsLoading(false);
        return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay

    const member = mockKioskMembers.find(m => 
        m.memberId.toLowerCase() === data.identifier.toLowerCase() && 
        m.gymId === currentKioskGymId
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

    try {
      const quoteInput: MotivationalQuoteInput = { memberId: member.memberId, memberName: member.name };
      const motivation = await generateMotivationalQuote(quoteInput);
      
      const newCheckInRecord: CheckIn = { // This is the full CheckIn type
        id: `checkin_${Date.now()}`,
        gymId: member.gymId,
        memberTableId: member.id,
        checkInTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      console.log("Mock Check-In Record Created:", newCheckInRecord);
      console.log(`SIMULATING: Email sent to ${member.email} for successful check-in.`);


      const formattedCheckinForDisplay: FormattedCheckIn = {
        memberName: member.name,
        memberId: member.memberId,
        checkInTime: new Date(newCheckInRecord.checkInTime),
        gymName: currentKioskGymName || member.gymId, // Use fetched gym name if available
      };

      if (onSuccessfulCheckin) {
        onSuccessfulCheckin(formattedCheckinForDisplay);
      }
      
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
      const fallbackQuote = "Keep pushing your limits!";
       const formattedCheckinForDisplayOnError: FormattedCheckIn = {
        memberName: member.name,
        memberId: member.memberId,
        checkInTime: new Date(),
        gymName: currentKioskGymName || member.gymId,
      };
       if (onSuccessfulCheckin) {
        onSuccessfulCheckin(formattedCheckinForDisplayOnError);
      }

      setCheckinStatus({ 
        type: 'success', 
        message: `Welcome back, ${member.name}! You're checked in.`,
        quote: fallbackQuote, 
        memberName: member.name,
      });
      toast({
        title: `Welcome ${member.name}!`,
        description: `Checked in successfully. ${fallbackQuote}`,
      });
      console.log(`SIMULATING: Email sent to ${member.email} for successful check-in (with fallback quote).`);
    } finally {
      form.reset(); 
      setIsLoading(false);
      setTimeout(() => setCheckinStatus(null), 10000); // Clear status after 10s
    }
  }

  const onScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
    console.log(`QR Code detected: ${decodedText}`, result);
    form.setValue('identifier', decodedText);
    toast({
        title: "QR Code Scanned",
        description: `Member ID ${decodedText} captured. Processing...`,
    });
    handleCancelScan(); // Stop camera and hide scanning UI
    setTimeout(() => {
      form.handleSubmit(onSubmit)();
    }, 200); // Short delay for user to see toast
  };

  const onScanFailure = (error: Html5QrcodeError | string) => {
    // Handle scan failure, usually ignore if it's just "QR code not found"
    // console.warn(`QR Scan Error: ${JSON.stringify(error)}`);
    // Can set a mild error message if needed, but often not for continuous scanning
  };

  useEffect(() => {
    if (isScanning && !html5QrCodeScannerRef.current) {
      setCameraError(null);
      try {
        const scanner = new Html5QrcodeScanner(
          QR_READER_ELEMENT_ID,
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
            rememberLastUsedCamera: true,
          },
          false // verbose
        );
        scanner.render(onScanSuccess, onScanFailure);
        html5QrCodeScannerRef.current = scanner;
      } catch (err: any) {
        console.error("Failed to initialize QR Scanner:", err);
        setCameraError(err.message || "Failed to initialize camera/scanner.");
        setIsScanning(false); // Stop scanning mode if init fails
      }
    }

    return () => {
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrCodeScanner.", error);
        });
        html5QrCodeScannerRef.current = null;
      }
    };
  }, [isScanning]);


  const handleScanQrCodeClick = () => {
    setIsScanning(true);
  };

  const handleCancelScan = () => {
    if (html5QrCodeScannerRef.current) {
      html5QrCodeScannerRef.current.clear().catch(error => {
        console.error("Failed to clear html5QrCodeScanner on cancel.", error);
      });
      html5QrCodeScannerRef.current = null;
    }
    setIsScanning(false);
    setCameraError(null);
  };


  if (isScanning) {
    return (
      <Card className={`w-full max-w-lg shadow-2xl ${className}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Scan QR Code</CardTitle>
          <CardDescription>Point your QR code at the camera.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id={QR_READER_ELEMENT_ID} className="w-full aspect-video bg-muted rounded-md border border-border">
            {/* QR Scanner will render here */}
          </div>
          
          {cameraError && (
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>Camera/Scanner Problem</AlertTitle>
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}
          {!cameraError && <div className="text-center text-muted-foreground text-sm">Initializing scanner... If prompted, please allow camera access.</div>}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCancelScan} className="w-full">
              <XCircle className="mr-2 h-5 w-5" /> Cancel Scan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className={`w-full max-w-lg shadow-2xl ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline">Check-in Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-left">Member ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your Member ID" 
                      {...field} 
                      className="text-base h-11"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentKioskGymId}>
                    <LogIn className="mr-2 h-5 w-5" /> Sign In
                </Button>
                <Button type="button" onClick={handleScanQrCodeClick} className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentKioskGymId}>
                    <QrCode className="mr-2 h-5 w-5" /> Scan QR Code
                </Button>
            </div>
          </form>
        </Form>

        {checkinStatus && (
          <Card className={`mt-6 ${checkinStatus.type === 'success' ? 'border-green-500' : checkinStatus.type === 'error' ? 'border-red-500' : 'border-blue-500'} bg-card/80`}>
            <CardContent className="p-6 text-center">
              {checkinStatus.type === 'success' && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />}
              {checkinStatus.type === 'error' && <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3" />}
              {checkinStatus.type === 'info' && <AlertTriangle className="mx-auto h-12 w-12 text-blue-500 mb-3" />}
              <p className={`text-xl font-semibold ${checkinStatus.type === 'success' ? 'text-green-400' : checkinStatus.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
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
