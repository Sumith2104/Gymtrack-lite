
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, type Html5QrcodeError, type Html5QrcodeResult } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CameraOff, XCircle, Info, ShieldAlert } from 'lucide-react';

interface QrScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

const QR_READER_ELEMENT_ID = "qr-reader-dialog-viewport";

export function QrScannerDialog({ isOpen, onOpenChange, onScanSuccess, onScanError }: QrScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showInitialPrompt, setShowInitialPrompt] = useState(false);

  useEffect(() => {
    let scannerInstance: Html5QrcodeScanner | null = null;

    const initializeScanner = () => {
      if (scannerRef.current || !document.getElementById(QR_READER_ELEMENT_ID)) {
        return;
      }
      setCameraError(null);
      setShowInitialPrompt(true); 

      try {
        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdgePercentage = 0.7;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return { width: qrboxSize, height: qrboxSize };
          },
          supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: "environment",
            aspectRatio: 1.0,
          }
        };

        scannerInstance = new Html5QrcodeScanner(QR_READER_ELEMENT_ID, config, false);
        scannerRef.current = scannerInstance;

        const successCallback = (decodedText: string, result: Html5QrcodeResult) => {
          setShowInitialPrompt(false);
          if (scannerRef.current) { // Check if still current
            scannerRef.current.clear().catch(e => console.warn("QR clear error on success:", e));
            scannerRef.current = null; // Ensure it's nulled after clear
          }
          onScanSuccess(decodedText);
          onOpenChange(false);
        };

        const errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
          setShowInitialPrompt(false);
           // Ignore common "not found" errors to reduce noise, but log them
          if (errorMessage.toLowerCase().includes("qr code parse error") || errorMessage.toLowerCase().includes("nomatched")) {
            console.warn("QR Scanner: No QR code found or parse error - ", errorMessage);
            return; 
          }
          console.error(`QR Scanner Error: ${errorMessage}`, error);
          // Only set cameraError for more persistent issues
          if(errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("constraint")) {
             setCameraError(`Scan Error: ${errorMessage}. Try again or enter ID manually.`);
          }
        };
        
        scannerInstance.render(successCallback, errorCallback);

      } catch (err: any) {
        setShowInitialPrompt(false);
        console.error("Failed to initialize QR Scanner instance or render:", err);
        setCameraError(`Initialization/Render error: ${err.message || "Unknown error"}. Try refreshing or check permissions.`);
        onScanError(`Initialization/Render error: ${err.message || "Unknown error"}. Please ensure camera permissions are granted.`);
      }
    };
    
    if (isOpen) {
        // Delay initialization slightly to ensure DOM element is ready
        const timer = setTimeout(() => {
            if (isOpen && !scannerRef.current) { // Check isOpen again in case it closed quickly
                 initializeScanner();
            }
        }, 100);
        return () => clearTimeout(timer);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear()
          .catch(e => console.warn("QR clear error on dialog close/unmount:", e))
          .finally(() => { scannerRef.current = null; });
      }
      setCameraError(null);
      setShowInitialPrompt(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Dependencies onScanSuccess, onScanError, onOpenChange are stable, but ESLint might complain if not listed. Add if needed.

  const handleDialogClose = () => {
    if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Error clearing scanner on dialog close button:", e));
        scannerRef.current = null;
    }
    setCameraError(null);
    setShowInitialPrompt(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-md p-6 bg-card text-card-foreground border-border rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Scan QR Code</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Center the QR code in the camera view. Attendance will be marked automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-6">
          <div id={QR_READER_ELEMENT_ID} className="w-full max-w-xs mx-auto aspect-square bg-muted rounded-md overflow-hidden relative shadow-inner border border-border">
            {/* The scanner will render its video feed here */}
            {!scannerRef.current && isOpen && !cameraError && (
                 <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                    Initializing camera...
                 </div>
            )}
          </div>
        </div>

        {showInitialPrompt && !cameraError && (
            <Alert className="mt-4 border-primary/50 bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary">Camera Access</AlertTitle>
                <AlertDescription className="text-primary/80">
                    Please grant camera access when prompted. Point your camera at a QR code.
                </AlertDescription>
            </Alert>
        )}
        
        {cameraError && (
          <Alert variant="destructive" className="mt-4">
            <CameraOff className="h-5 w-5" />
            <AlertTitle>Scanner Error</AlertTitle>
            <AlertDescription>{cameraError} Please ensure camera permissions are granted and no other app is using the camera. You might need to refresh the page.</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleDialogClose} className="w-full hover:bg-muted/50">
                <XCircle className="mr-2 h-5 w-5" /> Cancel Scan
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
