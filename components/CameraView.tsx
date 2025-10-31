import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface CameraActions {
    takePicture: () => void;
    startCountdown: (seconds: number) => void;
}

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
}

// Fix: Removed explicit React.FC type to allow forwardRef's type to be inferred correctly.
const CameraView = forwardRef<CameraActions, CameraViewProps>(({ onCapture }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-create audio elements to reduce delay
    // Removed beep sounds as requested
    beepAudioRef.current = null;
    shutterAudioRef.current = null;
  }, []);

  const takePicture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Limit the canvas size to prevent very large images
      const maxWidth = 1200;
      const maxHeight = 1200;
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Calculate the new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally for selfie view, if needed
        // context.translate(canvas.width, 0);
        // context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Use lower quality to reduce file size (0.8 = 80% quality)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        // Debug log the data URL
        console.log('Camera captured image data URL length:', dataUrl.length);
        console.log('Camera captured image data URL starts with:', dataUrl.substring(0, 100));

        // Validate that we have a proper data URL
        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
          console.error('Invalid image data URL generated:', dataUrl);
          // Try to capture again or show an error
          return;
        }

        // Removed shutter sound as requested
        onCapture(dataUrl);
      }
    }
  }, [onCapture]);
  
  const startCountdown = useCallback((seconds: number) => {
    if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
    }
    setCountdown(seconds);
    // Removed beep sound at start of countdown as requested

    countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
            if (prev === null || prev <= 1) {
                if(countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                takePicture();
                return null;
            }
            // Removed beep sound during countdown as requested
            return prev - 1;
        });
    }, 1000);
  }, [takePicture]);
  
  useImperativeHandle(ref, () => ({
    takePicture,
    startCountdown,
  }));

  useEffect(() => {
    let stream: MediaStream;
    const enableCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        try {
            // Fallback to any available camera
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (fallbackErr) {
            console.error('Fallback camera access failed:', fallbackErr);
        }
      }
    };
    enableCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />
      {countdown !== null && (
         <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
           <div className="text-9xl font-bold text-white animate-countdown">{countdown}</div>
         </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-10 inset-x-0 mx-auto w-11/12 max-w-lg text-white text-center p-4 rounded-lg bg-black/50 backdrop-blur-sm">
        <p className="hidden md:block">Ready to capture. See commands on the right.</p>
        <div className="md:hidden text-sm">
            <p className="font-bold mb-2">Try Saying:</p>
            <div className="flex justify-center gap-2 flex-wrap">
                <code className="bg-white/10 px-3 py-1 rounded-full text-xs">Photo</code>
                <code className="bg-white/10 px-3 py-1 rounded-full text-xs">Photo in 5 seconds</code>
                <code className="bg-white/10 px-3 py-1 rounded-full text-xs">Photo 3 seconds</code>
                <code className="bg-white/10 px-3 py-1 rounded-full text-xs">Back</code>
            </div>
        </div>
      </div>
    </div>
  );
});

export default CameraView;