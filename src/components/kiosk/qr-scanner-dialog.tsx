
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, type Html5QrcodeError, type Html5QrcodeResult } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CameraOff, XCircle, Info } from 'lucide-react';

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

  const initializeScanner = () => {
    if (scannerRef.current || !document.getElementById(QR_READER_ELEMENT_ID)) {
      return;
    }

    try {
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = 0.8;
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

      const newScanner = new Html5QrcodeScanner(QR_READER_ELEMENT_ID, config, false);
      scannerRef.current = newScanner;

      const successCallback = (decodedText: string, result: Html5QrcodeResult) => {
        if (scannerRef.current) {
          scannerRef.current.clear()
            .catch(e => console.warn("QR clear error on success:", e?.message || e))
            .finally(() => {
              scannerRef.current = null;
              onScanSuccess(decodedText);
              onOpenChange(false); 
            });
        } else {
          onScanSuccess(decodedText);
          onOpenChange(false);
        }
      };

      const errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
        if (errorMessage.toLowerCase().includes("qr code parse error") || errorMessage.toLowerCase().includes("nomatched")) {
          return;
        }
        
        if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("constraint")) {
           setCameraError(`Scan Error: ${errorMessage}. Try again or enter ID manually.`);
        }
      };
      
      newScanner.render(successCallback, errorCallback);

    } catch (err: any) {
      
      setCameraError(`Initialization/Render error: ${err.message || "Unknown error"}. Try refreshing or check permissions.`);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setCameraError(null); 
      setShowInitialPrompt(true); 

      const timer = setTimeout(() => {
        if (isOpen && !scannerRef.current && document.getElementById(QR_READER_ELEMENT_ID)) {
          initializeScanner();
        }
      }, 150); 
      return () => clearTimeout(timer);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear()
          .catch(e => {
            console.warn("QR clear error in useEffect on dialog close:", e?.message || e);
          })
          .finally(() => {
            scannerRef.current = null;
          });
      }
      setCameraError(null);
      setShowInitialPrompt(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); 

  const handleDialogClose = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}> 
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-md p-4 bg-card text-card-foreground border-border rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Scan QR Code</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Center the QR code in the camera view. Attendance will be marked automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="w-full aspect-square max-w-xs mx-auto my-4">
          <div 
            id={QR_READER_ELEMENT_ID} 
            className="w-full h-full bg-muted rounded-md overflow-hidden relative shadow-inner border border-border"
          >
            {/* NO REACT-RENDERED CHILDREN HERE */}
          </div>
        </div>
        
        {isOpen && showInitialPrompt && !cameraError && !scannerRef.current && (
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
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        )}

        {isOpen && !showInitialPrompt && !cameraError && !scannerRef.current && (
           <Alert variant="default" className="mt-4">
             <Info className="h-5 w-5" />
             <AlertTitle>Scanner Status</AlertTitle>
             <AlertDescription>Initializing camera... If this persists, check permissions.</AlertDescription>
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
