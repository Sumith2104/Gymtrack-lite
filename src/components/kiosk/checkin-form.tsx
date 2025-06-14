
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

const checkinSchema = z.object({
  identifier: z.string().min(1, { message: 'Member ID or QR code data is required.' }),
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
  onSuccessfulCheckin: (checkinEntry: FormattedCheckIn) => void;
  todaysCheckins: FormattedCheckIn[];
}

const QR_READER_ELEMENT_ID = "qr-reader-kiosk";

export function CheckinForm({ className, onSuccessfulCheckin, todaysCheckins }: CheckinFormProps) {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; quote?: string; memberName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKioskFormattedGymId, setCurrentKioskFormattedGymId] = useState<string | null>(null);
  const [currentKioskGymName, setCurrentKioskGymName] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeScannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentKioskFormattedGymId(localStorage.getItem('gymId'));
      setCurrentKioskGymName(localStorage.getItem('gymName'));
    }
  }, []);

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      identifier: '',
    },
  });

  const isAlreadyCheckedInToday = (memberTableId: string): boolean => {
    return todaysCheckins.some(ci => ci.memberTableId === memberTableId);
  };

  async function onSubmit(data: CheckinFormValues) {
    setIsLoading(true);
    setCheckinStatus(null);
    
    if (!currentKioskFormattedGymId || !currentKioskGymName) {
        setCheckinStatus({ type: 'error', message: 'Kiosk configuration error. Please contact admin.' });
        setIsLoading(false);
        return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 700));

    const member = mockKioskMembers.find(m => 
        m.memberId.toLowerCase() === data.identifier.toLowerCase() && 
        m.gymId === currentKioskFormattedGymId
    );

    if (!member) {
      setCheckinStatus({ type: 'error', message: 'Member not found for this gym or ID is invalid.' });
      setIsLoading(false);
      return;
    }

    if (member.membershipStatus === 'expired') {
      setCheckinStatus({ type: 'error', message: `Membership for ${member.name} is expired. Please see reception.` });
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

    if (isAlreadyCheckedInToday(member.id)) {
      setCheckinStatus({ type: 'info', message: `${member.name}, you are already checked in today.` });
      setIsLoading(false);
      return;
    }

    try {
      const quoteInput: MotivationalQuoteInput = { memberId: member.memberId, memberName: member.name };
      const motivation = await generateMotivationalQuote(quoteInput);
      
      console.log(`SIMULATING: Check-in record created for member ${member.id} at gym ${member.gymId}.`);
      
      if (member.email) {
        console.log(`SIMULATING: Email confirmation sent to ${member.email} for successful check-in. Quote: "${motivation.quote}"`);
      } else {
        console.log(`SIMULATING: Member ${member.name} has no email on file. No email sent.`);
      }

      const formattedCheckinForDisplay: FormattedCheckIn = {
        memberTableId: member.id,
        memberName: member.name,
        memberId: member.memberId,
        checkInTime: new Date(),
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
        checkInTime: new Date(),
        gymName: currentKioskGymName,
      };
      onSuccessfulCheckin(formattedCheckinForDisplayOnError);

      setCheckinStatus({ 
        type: 'success', 
        message: `Welcome, ${member.name}! Enjoy your workout.`,
        quote: fallbackQuote, 
        memberName: member.name,
      });
      if (member.email) {
         console.log(`SIMULATING: Email confirmation sent to ${member.email} (with fallback quote).`);
      }
    } finally {
      form.reset(); 
      setIsLoading(false);
      setTimeout(() => setCheckinStatus(null), 10000);
    }
  }

  const onScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
    form.setValue('identifier', decodedText);
    toast({
        title: "QR Code Scanned",
        description: `Member ID ${decodedText} captured. Processing...`,
    });
    handleCancelScan(); 
    setTimeout(() => {
      form.handleSubmit(onSubmit)();
    }, 200); 
  };

  const onScanFailure = (error: Html5QrcodeError | string) => {
    // Usually ignore "QR code not found"
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
        html5QrCodeScannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrCodeScanner.", error);
        });
        html5QrCodeScannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);


  const handleScanQrCodeClick = () => {
    setIsScanning(true);
    setCheckinStatus(null);
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
      <Card className={`max-w-lg shadow-2xl w-full ${className}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Scan QR Code</CardTitle>
          <CardDescription>Point your QR code at the camera.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id={QR_READER_ELEMENT_ID} className="w-full aspect-square bg-muted rounded-md border border-border overflow-hidden">
            {/* QR Scanner will render here */}
          </div>
          
          {cameraError && (
            <Alert variant="destructive">
              <CameraOff className="mr-2 h-4 w-4" />
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
    <Card className={`max-w-lg shadow-2xl w-full ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline">Member Check-in</CardTitle>
        <CardDescription>Enter Member ID or Scan QR</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-left">Member ID / QR Data</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter Member ID or scan QR" 
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
                <Button type="submit" className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentKioskFormattedGymId}>
                    <LogIn className="mr-2 h-5 w-5" /> Sign In
                </Button>
                <Button type="button" onClick={handleScanQrCodeClick} className="w-full text-base py-5 sm:flex-1" disabled={isLoading || !currentKioskFormattedGymId}>
                    <ScanLine className="mr-2 h-5 w-5" /> Scan QR Code
                </Button>
            </div>
          </form>
        </Form>

        {checkinStatus && (
          <Card className={`mt-6 ${
            checkinStatus.type === 'success' ? 'border-green-500' 
            : checkinStatus.type === 'error' ? 'border-red-500' 
            : 'border-blue-500'
          } bg-card/80`}>
            <CardContent className="p-6 text-center">
              {checkinStatus.type === 'success' && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />}
              {checkinStatus.type === 'error' && <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3" />}
              {checkinStatus.type === 'info' && <AlertTriangle className="mx-auto h-12 w-12 text-blue-500 mb-3" />}
              
              <p className={`text-xl font-semibold ${
                checkinStatus.type === 'success' ? 'text-green-400' 
                : checkinStatus.type === 'error' ? 'text-red-400' 
                : 'text-blue-400'
              }`}>
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
