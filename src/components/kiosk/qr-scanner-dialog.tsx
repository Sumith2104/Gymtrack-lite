
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, type Html5QrcodeError, type Html5QrcodeResult } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CameraOff, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const qrElement = document.getElementById(QR_READER_ELEMENT_ID);
      if (!qrElement) {
        setTimeout(() => {
          if(isOpen && !scannerRef.current) {
             initializeScanner();
          }
        }, 100);
        return;
      }
      initializeScanner();
    } else {
      clearScanner();
    }

    function initializeScanner() {
        if (scannerRef.current) {
            console.log("QR Scanner already initialized.");
            return;
        }
        setCameraError(null);
        try {
            const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
            rememberLastUsedCamera: true,
            videoConstraints: {
                facingMode: "environment", 
                aspectRatio: 1.0 
            }
            };

            const newScanner = new Html5QrcodeScanner(QR_READER_ELEMENT_ID, config, false);

            const successCallback = (decodedText: string, result: Html5QrcodeResult) => {
                clearScanner();
                onScanSuccess(decodedText);
                onOpenChange(false); 
            };

            const errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
                if (errorMessage.toLowerCase().includes("qr code parse error") || errorMessage.toLowerCase().includes("nomatched")) {
                    return;
                }
                console.error(`QR Scanner Error: ${errorMessage}`, error);
                setCameraError(`Scan Error: ${errorMessage}. Try again or enter ID manually.`);
            };
            
            // The render method does not return a promise, so .catch cannot be chained here.
            // Synchronous errors from render() or new Html5QrcodeScanner() will be caught by the outer try...catch.
            // Asynchronous errors during scanning are handled by the errorCallback.
            newScanner.render(successCallback, errorCallback);
            
            scannerRef.current = newScanner;
        } catch (err: any) {
            console.error("Failed to initialize QR Scanner instance or render:", err);
            setCameraError(`Initialization/Render error: ${err.message || "Unknown error"}. Try refreshing or check permissions.`);
            onScanError(`Initialization/Render error: ${err.message || "Unknown error"}. Please ensure camera permissions are granted.`);
        }
    }


    function clearScanner() {
      if (scannerRef.current) {
        scannerRef.current.clear()
          .then(() => {
            console.log("QR Scanner cleared successfully.");
          })
          .catch(error => {
            console.error("Failed to clear html5QrCodeScanner.", error);
          })
          .finally(() => {
            scannerRef.current = null;
          });
      }
    }
    
    return () => {
      clearScanner();
    };
  }, [isOpen, onScanSuccess, onScanError, onOpenChange]);

  const handleDialogClose = () => {
    if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Error clearing scanner on dialog close:", e));
        scannerRef.current = null;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md p-4 bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>Point your member ID QR code at the camera. The scanner will automatically detect it.</DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <div id={QR_READER_ELEMENT_ID} className="w-full max-w-xs mx-auto aspect-square bg-muted rounded-md overflow-hidden relative shadow-inner border">
            {/* The scanner will render its video feed here */}
          </div>
        </div>

        {cameraError && (
          <Alert variant="destructive" className="mt-4">
            <CameraOff className="h-4 w-4" />
            <AlertTitle>Scanner Error</AlertTitle>
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        )}
         {!cameraError && !scannerRef.current && isOpen && (
          <div className="text-center text-muted-foreground text-sm py-2">
            Initializing camera... If prompted, please allow camera access.
          </div>
        )}

        <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleDialogClose} className="w-full sm:w-auto">
                <XCircle className="mr-2 h-5 w-5" /> Cancel Scan
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
