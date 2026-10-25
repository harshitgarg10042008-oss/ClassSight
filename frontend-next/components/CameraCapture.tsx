'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CameraCaptureProps = {
  onCapture: (file: File) => void;
  disabled?: boolean;
  captureLabel?: string;
  className?: string;
};

function cameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Camera is busy in another app or browser tab. Close it and try again.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No camera was found on this device.';
  return error instanceof Error ? error.message : 'Could not start the camera. Check permissions and try again.';
}

export default function CameraCapture({ onCapture, disabled = false, captureLabel = 'Capture photo', className = '' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const stop = useCallback(() => {
    const video = videoRef.current;
    if (video) video.srcObject = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const available = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
    setDevices(available);
    if (deviceId && !available.some(device => device.deviceId === deviceId)) setDeviceId('');
  }, [deviceId]);

  const start = useCallback(async (chosenDevice = deviceId) => {
    stop();
    setError('');
    setLoading(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable. Use a secure (HTTPS or localhost) page or upload a photo instead.');
      setLoading(false);
      return;
    }
    try {
      const constraints: MediaStreamConstraints = { video: chosenDevice ? { deviceId: { exact: chosenDevice } } : { facingMode: 'user' }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        return;
      }
      video.srcObject = stream;
      await video.play();
      await refreshDevices();
      setLoading(false);
    } catch (cause) {
      setError(cameraError(cause));
      setLoading(false);
      stop();
    }
  }, [deviceId, refreshDevices, stop]);

  useEffect(() => {
    void refreshDevices();
    void start('');
    const update = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener?.('devicechange', update);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', update);
      stop();
    };
    // The stream is intentionally started once when this component mounts.
    // Changing devices is handled explicitly by the selector below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready || !video.videoWidth || !video.videoHeight) {
      setError('Camera not ready, try again');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      setError('Camera not ready, try again');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let brightness = 0;
    const step = Math.max(4, Math.floor(pixels.length / 4000 / 4) * 4);
    let samples = 0;
    for (let i = 0; i < pixels.length; i += step) { brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; samples++; }
    if (!samples || brightness / samples < 2) {
      setError('Camera not ready, try again');
      return;
    }
    setError('');
    canvas.toBlob(blob => {
      if (!blob) { setError('Camera not ready, try again'); return; }
      onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  const switchDevice = (nextId: string) => {
    setDeviceId(nextId);
    void start(nextId);
  };

  return (
    <div className={`camera-capture ${className}`}>
      {devices.length > 0 && <label className="camera-selector">Camera
        <select aria-label="Choose camera" value={deviceId} onChange={event => switchDevice(event.target.value)}>
          <option value="">Default camera</option>
          {devices.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
        </select>
      </label>}
      <div className="webcam-wrap">
        <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={event => {
          const video = event.currentTarget;
          setReady(video.videoWidth > 0 && video.videoHeight > 0);
        }} onCanPlay={event => {
          const video = event.currentTarget;
          setReady(video.videoWidth > 0 && video.videoHeight > 0);
        }} style={{ width: '100%', maxHeight: 420, display: 'block', objectFit: 'cover' }} />
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="webcam-actions">
        <button type="button" onClick={capture} disabled={disabled || !ready}>{captureLabel}</button>
        {loading && <span className="hint">Starting camera…</span>}
        {!ready && !loading && <button type="button" className="btn-secondary" onClick={() => void start()}>Restart camera</button>}
      </div>
    </div>
  );
}
