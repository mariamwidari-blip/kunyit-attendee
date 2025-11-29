import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const isStoppingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            // Prevent multiple scans
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            
            await stopScanner();
            onScan(decodedText);
          },
          () => {
            // Ignore scan errors
          }
        );
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        setError("Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.");
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScan, stopScanner]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan QR Code
            </h3>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={handleClose} variant="outline" className="w-full">
                Tutup
              </Button>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
              <p className="text-xs text-center text-muted-foreground">
                Arahkan kamera ke QR code
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
