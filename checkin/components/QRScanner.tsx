'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

export default function QRScanner({ onScan, onError, autoStart = true }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  useEffect(() => {
    // Initialize QR code reader
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    // Get available video devices and auto-start
    BrowserQRCodeReader.listVideoInputDevices()
      .then((videoDevices: MediaDeviceInfo[]) => {
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Select back camera by default (for mobile)
          const backCamera = videoDevices.find((device: MediaDeviceInfo) =>
            device.label.toLowerCase().includes('back')
          );
          const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;
          setSelectedDevice(deviceId);
          
          // Auto-start scanning if enabled
          if (autoStart) {
            setTimeout(() => startScanningWithDevice(deviceId), 500);
          }
        }
      })
      .catch((err: any) => {
        console.error('Error listing video devices:', err);
        onError?.('Failed to access camera. Please check permissions.');
      });

    return () => {
      // Cleanup on unmount
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScanningWithDevice = async (deviceId: string) => {
    if (!readerRef.current || !videoRef.current || !deviceId) return;

    setIsScanning(true);
    try {
      await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            onScan(result.getText());
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      onError?.('Failed to start camera scanner.');
      setIsScanning(false);
    }
  };

  const startScanning = async () => {
    await startScanningWithDevice(selectedDevice);
  };

  const stopScanning = () => {
    if (readerRef.current) {
      // Stop all video streams
      const videoElement = videoRef.current;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoElement.srcObject = null;
      }
    }
    setIsScanning(false);
  };

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-80 object-cover"
          style={{ maxWidth: '100%' }}
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-center text-white">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.99c.88 0 1.337 1.077.707 1.707l-4.99 4.99c-.63.63-1.707.184-1.707-.707V12z" />
              </svg>
              <p className="text-sm">Initializing camera...</p>
            </div>
          </div>
        )}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Scanning frame */}
            <div className="relative w-64 h-64">
              {/* Corner borders */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400"></div>
              
              {/* Scanning line animation */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-scan"></div>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        {isScanning && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Scanning...
          </div>
        )}
      </div>

      {/* Camera Selection (only if multiple cameras) */}
      {devices.length > 1 && (
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <select
            value={selectedDevice}
            onChange={(e) => {
              stopScanning();
              setSelectedDevice(e.target.value);
              setTimeout(() => startScanningWithDevice(e.target.value), 300);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800 text-center flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Position the QR code within the frame to scan automatically
        </p>
      </div>
    </div>
  );
}
