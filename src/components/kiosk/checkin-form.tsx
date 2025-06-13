
'use client';

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { QrCode, LogIn, AlertTriangle, CheckCircle2, PartyPopper, Video, XCircle, ScanLine, CameraOff } from 'lucide-react';

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

export function CheckinForm({ className }: { className?: string }) {
  const { toast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; quote?: string; memberName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKioskGymId, setCurrentKioskGymId] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentKioskGymId(localStorage.getItem('gymId') || 'GYM123_default');
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    // Cleanup camera on component unmount
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setQrError(null);
    setHasCameraPermission(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        let message = 'Could not access the camera. Please ensure permissions are granted.';
        if (error instanceof Error) {
            if (error.name === "NotAllowedError") {
                message = "Camera access was denied. Please enable camera permissions in your browser settings.";
            } else if (error.name === "NotFoundError") {
                message = "No camera found. Please ensure a camera is connected and enabled.";
            } else if (error.name === "NotReadableError") {
                message = "Camera is already in use or there was an issue accessing it.";
            }
        }
        setQrError(message);
        toast({
          variant: 'destructive',
          title: 'Camera Access Failed',
          description: message,
        });
      }
    } else {
      setHasCameraPermission(false);
      setQrError('Camera access is not supported by your browser or device.');
      toast({
        variant: 'destructive',
        title: 'Camera Not Supported',
        description: 'QR scanning requires camera access, which is not supported here.',
      });
    }
  };


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
    
    await new Promise(resolve => setTimeout(resolve, 700));

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
      
      const newCheckIn: CheckIn = {
        id: `checkin_${Date.now()}`,
        gymId: member.gymId,
        memberTableId: member.id,
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
      setTimeout(() => setCheckinStatus(null), 10000);
    }
  }

  const handleScanQrCodeClick = () => {
    setIsScanning(true);
    startCamera();
  };

  const handleCancelScan = () => {
    setIsScanning(false);
    stopCamera();
    setQrError(null);
    setHasCameraPermission(null);
  };

  const handleSimulateScan = () => {
    // Simulate scanning a QR code and getting member ID
    const simulatedMemberId = 'SUMITH001'; // Use an existing mock member for successful check-in
    form.setValue('identifier', simulatedMemberId);
    toast({
        title: "QR Code Scanned (Simulated)",
        description: `Member ID ${simulatedMemberId} captured. Signing in...`,
    });
    handleCancelScan(); // Stop camera and hide scanning UI
    // Timeout to allow user to see the toast before form submission visual feedback
    setTimeout(() => {
         form.handleSubmit(onSubmit)();
    }, 500);
  };

  if (isScanning) {
    return (
      <Card className={`w-full max-w-lg shadow-2xl ${className}`}>
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <Video className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline">Scan QR Code</CardTitle>
          <CardDescription>Point your QR code at the camera.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video w-full bg-muted rounded-md overflow-hidden border border-border">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          </div>
          
          {hasCameraPermission === false && qrError && (
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>Camera Problem</AlertTitle>
              <AlertDescription>{qrError}</AlertDescription>
            </Alert>
          )}
           {hasCameraPermission === null && !qrError && (
             <div className="text-center text-muted-foreground py-4">Requesting camera access...</div>
           )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSimulateScan} className="w-full" disabled={!hasCameraPermission || isLoading}>
              <ScanLine className="mr-2 h-5 w-5" /> Simulate Successful Scan
            </Button>
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
         <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
          {/* Reverted to QrCode icon for consistency with image, LogIn was for the button */}
          <LogIn className="h-10 w-10 text-primary-foreground" /> 
        </div>
        <CardTitle className="text-3xl font-headline">Check-in Form</CardTitle>
        <CardDescription>Use your Member ID or QR code. Current Gym: {currentKioskGymId || 'Loading...'}</CardDescription>
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
              {checkinStatus.type === 'info' && <AlertTriangle className="mx-auto h-12 w-12 text-blue-500 mb-3" />} {/* Should be AlertCircle? Icon was AlertTriangle */}
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
