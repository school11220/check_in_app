'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  scanCooldown?: number; // ms between scans to prevent duplicates
}

export default function QRScanner({
  onScan,
  onError,
  autoStart = true,
  scanCooldown = 2000
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [flashlightSupported, setFlashlightSupported] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]); // Pattern: vibrate 100ms, pause 50ms, vibrate 100ms
    }
  }, []);

  // Play success sound
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      // Audio not supported
    }
  }, []);

  // Handle successful scan with cooldown
  const handleSuccessfulScan = useCallback((code: string) => {
    const now = Date.now();
    if (code === lastScannedCode && now - lastScanTimeRef.current < scanCooldown) {
      return; // Skip duplicate scan within cooldown
    }

    setLastScannedCode(code);
    lastScanTimeRef.current = now;

    // Visual feedback
    setScanSuccess(true);
    setTimeout(() => setScanSuccess(false), 1500);

    // Haptic & audio feedback
    triggerHapticFeedback();
    playSuccessSound();

    // Notify parent
    onScan(code);
  }, [lastScannedCode, scanCooldown, onScan, triggerHapticFeedback, playSuccessSound]);

  // Toggle flashlight
  const toggleFlashlight = useCallback(async () => {
    if (!trackRef.current) return;

    try {
      const capabilities = trackRef.current.getCapabilities() as any;
      if (capabilities.torch) {
        const newState = !flashlightOn;
        await trackRef.current.applyConstraints({
          advanced: [{ torch: newState } as any]
        });
        setFlashlightOn(newState);
      }
    } catch (err) {
      console.error('Failed to toggle flashlight:', err);
    }
  }, [flashlightOn]);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    BrowserQRCodeReader.listVideoInputDevices()
      .then((videoDevices: MediaDeviceInfo[]) => {
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          const backCamera = videoDevices.find((device: MediaDeviceInfo) =>
            device.label?.toLowerCase().includes('back') ||
            device.label?.toLowerCase().includes('rear')
          );
          const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;
          setSelectedDevice(deviceId);

          if (autoStart) {
            setTimeout(() => startScanningWithDevice(deviceId), 500);
          }
        } else {
          setCameraError('No camera devices found');
        }
      })
      .catch((err: any) => {
        console.error('Error listing video devices:', err);
        setCameraError('Camera access denied. Please grant permission.');
        onError?.('Failed to access camera. Please check permissions.');
      });

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScanningWithDevice = async (deviceId: string) => {
    if (!readerRef.current || !videoRef.current || !deviceId) return;

    setCameraError('');
    setIsScanning(true);

    try {
      await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleSuccessfulScan(result.getText());
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Scan error:', error);
          }
        }
      );

      // Check for flashlight support after stream is active
      const videoElement = videoRef.current;
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          setFlashlightSupported(true);
        }
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setCameraError(err.message || 'Failed to start camera');
      onError?.('Failed to start camera scanner.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
    }

    const videoElement = videoRef.current;
    if (videoElement?.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }

    setIsScanning(false);
    setFlashlightOn(false);
    setFlashlightSupported(false);
  };

  const switchCamera = (deviceId: string) => {
    stopScanning();
    setSelectedDevice(deviceId);
    setTimeout(() => startScanningWithDevice(deviceId), 300);
  };

  return (
    <div className="relative w-full h-full">
      {/* Video Preview */}
      <div className={`absolute inset-0 bg-zinc-950 transition-colors duration-300 ${scanSuccess ? 'ring-2 ring-inset ring-green-500' : ''}`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Camera Error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90">
            <div className="text-center text-white p-6">
              <svg className="w-16 h-16 mx-auto mb-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-400 mb-4">{cameraError}</p>
              <button
                onClick={() => startScanningWithDevice(selectedDevice)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-zinc-400">Initializing camera...</p>
            </div>
          </div>
        )}

        {/* Scanning Frame - Removed to avoid duplication with parent component */}

        {/* Success Overlay */}
        {scanSuccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-900/50 pointer-events-none">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-bold text-green-400">Scanned!</p>
            </div>
          </div>
        )}

        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          {/* Flashlight Toggle */}
          {flashlightSupported && (
            <button
              onClick={toggleFlashlight}
              className={`p-3 rounded-full transition-colors shadow-lg ${flashlightOn
                ? 'bg-yellow-500 text-black'
                : 'bg-zinc-800/80 text-white hover:bg-zinc-700'
                }`}
              title={flashlightOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            >
              <svg className="w-5 h-5" fill={flashlightOn ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          )}

          {/* Status indicator */}
          {isScanning && (
            <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg ml-auto">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Scanning
            </div>
          )}
        </div>
      </div>

      {/* Camera Selection */}
      {devices.length > 1 && (
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <select
            value={selectedDevice}
            onChange={(e) => switchCamera(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white text-sm"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

    </div>
  );
}
