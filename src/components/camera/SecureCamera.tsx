"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Camera, Check, X, Upload, AlertTriangle, 
  RefreshCw, Shield, Lock
} from "lucide-react";

interface SecureCameraProps {
  onCapture: (imageData: string, method: "camera" | "upload") => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  showFallbackUpload?: boolean;
  requireUserAction?: boolean;
}

interface CameraState {
  status: "idle" | "requesting" | "active" | "error" | "captured";
  error: string | null;
  isSecure: boolean;
  permissionDenied: boolean;
}

/**
 * SecureCamera Component
 * - HTTPS enforced awareness
 * - User-triggered camera access only
 * - Professional fallback with file upload
 * - Device compatibility checks
 * - Consent-based capture flow
 */
export function SecureCamera({ 
  onCapture, 
  onError, 
  disabled = false,
  showFallbackUpload = true,
  requireUserAction = true
}: SecureCameraProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    status: "idle",
    error: null,
    isSecure: false,
    permissionDenied: false
  });

  // Check security context on mount
  useEffect(() => {
    const checkSecurityContext = () => {
      const isLocalhost = window.location.hostname === "localhost" || 
                          window.location.hostname === "127.0.0.1";
      const isHttps = window.location.protocol === "https:";
      const isSecure = isLocalhost || isHttps;
      
      setCameraState(prev => ({ ...prev, isSecure }));
      
      if (!isSecure) {
        console.warn("[SecureCamera] Non-secure context detected. Camera may not work.");
      }
    };

    checkSecurityContext();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  /**
   * Check browser support and permissions
   */
  const checkCameraSupport = useCallback((): { supported: boolean; error?: string } => {
    // Check if mediaDevices API exists
    if (!navigator.mediaDevices) {
      return { 
        supported: false, 
        error: t('cam_no_browser_support')
      };
    }

    if (!navigator.mediaDevices.getUserMedia) {
      return { 
        supported: false, 
        error: t('cam_no_getusermedia')
      };
    }

    // Check secure context
    if (!cameraState.isSecure) {
      return { 
        supported: false, 
        error: t('cam_requires_https')
      };
    }

    return { supported: true };
  }, [cameraState.isSecure]);

  /**
   * Start camera - MUST be triggered by user action (click)
   */
  const startCamera = useCallback(async () => {
    // Verify this is a user-initiated action
    if (requireUserAction && !document.hasFocus()) {
      setCameraState(prev => ({
        ...prev,
        status: "error",
        error: t('cam_user_action_required')
      }));
      return;
    }

    // Check browser support
    const { supported, error } = checkCameraSupport();
    if (!supported) {
      setCameraState(prev => ({
        ...prev,
        status: "error",
        error: error || t('cam_not_supported')
      }));
      onError?.(error || t('cam_not_supported'));
      return;
    }

    setCameraState(prev => ({ ...prev, status: "requesting", error: null }));

    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Request camera with optimal settings
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Front camera for face
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: false // Never request audio for face verification
      });

      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not found"));
            return;
          }
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          videoRef.current.onerror = () => reject(new Error("Video failed to load"));
        });
      }

      setStream(mediaStream);
      setCapturedImage(null);
      setCameraState(prev => ({ 
        ...prev, 
        status: "active", 
        error: null,
        permissionDenied: false 
      }));

    } catch (error: any) {
      console.error("[SecureCamera] Camera error:", error);
      
      let errorMessage = t('cam_access_error');
      let permissionDenied = false;

      switch (error.name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          errorMessage = t('cam_permission_denied');
          permissionDenied = true;
          break;
        case "NotFoundError":
        case "DevicesNotFoundError":
          errorMessage = t('cam_not_found');
          break;
        case "NotReadableError":
        case "TrackStartError":
          errorMessage = t('cam_in_use');
          break;
        case "OverconstrainedError":
          errorMessage = t('cam_overconstrained');
          break;
        case "NotSupportedError":
          errorMessage = t('cam_not_supported_browser');
          break;
        case "AbortError":
          errorMessage = t('cam_aborted');
          break;
        case "SecurityError":
          errorMessage = t('cam_security_error');
          break;
        default:
          errorMessage = `${t('cam_error_generic')}: ${error.message || error.name}`;
      }

      setCameraState(prev => ({
        ...prev,
        status: "error",
        error: errorMessage,
        permissionDenied
      }));
      onError?.(errorMessage);
    }
  }, [stream, checkCameraSupport, requireUserAction, onError]);

  /**
   * Stop camera and release resources
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraState(prev => ({ ...prev, status: "idle", error: null }));
    setCapturedImage(null);
  }, [stream]);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("[SecureCamera] Video or canvas ref not available");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.error("[SecureCamera] Canvas context not available");
      return;
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to JPEG with good quality
    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    
    if (imageData && imageData.length > 100) {
      setCapturedImage(imageData);
      setCameraState(prev => ({ ...prev, status: "captured" }));
    } else {
      const error = t('cam_capture_failed');
      setCameraState(prev => ({ ...prev, error }));
      onError?.(error);
    }
  }, [onError]);

  /**
   * Confirm and submit captured image
   */
  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage, "camera");
      stopCamera();
    }
  }, [capturedImage, onCapture, stopCamera]);

  /**
   * Retake photo - go back to active camera
   */
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCameraState(prev => ({ ...prev, status: "active" }));
  }, []);

  /**
   * Handle file upload (fallback method)
   */
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const error = t('cam_select_image');
      setCameraState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const error = t('cam_image_too_large');
      setCameraState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setCapturedImage(result);
        setCameraState(prev => ({ ...prev, status: "captured" }));
      }
    };
    reader.onerror = () => {
      const error = t('cam_read_error');
      setCameraState(prev => ({ ...prev, error }));
      onError?.(error);
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = "";
  }, [onError]);

  /**
   * Open file picker for fallback upload
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Confirm uploaded image
   */
  const confirmUpload = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage, "upload");
      setCapturedImage(null);
      setCameraState(prev => ({ ...prev, status: "idle" }));
    }
  }, [capturedImage, onCapture]);

  return (
    <div className="secure-camera-container">
      {/* Security Warning Banner */}
      {!cameraState.isSecure && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{t('cam_insecure_connection')}</p>
              <p className="text-xs opacity-80">
                {t('cam_requires_https_short')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Camera/Preview Area */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden" 
           style={{ aspectRatio: "4/3" }}>
        
        {/* Idle State - Camera Off */}
        {cameraState.status === "idle" && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg font-medium">{t('cam_ready')}</p>
              <p className="text-sm opacity-75 mt-1">{t('cam_click_to_start')}</p>
            </div>
          </div>
        )}

        {/* Requesting State - Loading */}
        {cameraState.status === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium">{t('cam_requesting')}...</p>
              <p className="text-sm opacity-75 mt-1">{t('cam_please_allow')}</p>
            </div>
          </div>
        )}

        {/* Active State - Video Stream */}
        {cameraState.status === "active" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Live indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {t('cam_live')}
            </div>
            {/* Secure indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
              <Shield className="w-4 h-4" />
              {t('cam_secure')}
            </div>
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-2 border-white/50 rounded-3xl" />
            </div>
          </>
        )}

        {/* Captured State - Preview */}
        {cameraState.status === "captured" && capturedImage && (
          <>
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-bold">
              <Check className="w-4 h-4" />
              {t('cam_photo_captured')}
            </div>
          </>
        )}

        {/* Error State */}
        {cameraState.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 font-medium mb-2">{t('cam_access_impossible')}</p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">{cameraState.error}</p>
              
              {cameraState.permissionDenied && (
                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-xs text-blue-300">
                    <Lock className="inline w-3 h-3 mr-1" />
                    {t('cam_lock_tip')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Control Buttons */}
      <div className="mt-4 space-y-3">
        {/* Main Controls */}
        <div className="flex gap-3">
          {/* Idle: Start Camera Button */}
          {cameraState.status === "idle" && !capturedImage && (
            <button
              onClick={startCamera}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              {t('cam_start')}
            </button>
          )}

          {/* Active: Capture & Stop Buttons */}
          {cameraState.status === "active" && (
            <>
              <button
                onClick={capturePhoto}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                <Camera className="w-5 h-5" />
                {t('cam_capture')}
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </>
          )}

          {/* Captured: Confirm & Retake Buttons */}
          {cameraState.status === "captured" && capturedImage && (
            <>
              <button
                onClick={stream ? confirmCapture : confirmUpload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                <Check className="w-5 h-5" />
                {t('validate')}
              </button>
              <button
                onClick={stream ? retakePhoto : () => {
                  setCapturedImage(null);
                  setCameraState(prev => ({ ...prev, status: "idle" }));
                }}
                className="px-4 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-all"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </>
          )}

          {/* Error: Retry Button */}
          {cameraState.status === "error" && (
            <button
              onClick={startCamera}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              {t('try_again')}
            </button>
          )}

          {/* Requesting: Loading State */}
          {cameraState.status === "requesting" && (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-400 text-white font-bold rounded-xl cursor-not-allowed"
            >
              <RefreshCw className="w-5 h-5 animate-spin" />
              {t('loading')}...
            </button>
          )}
        </div>

        {/* Fallback Upload Option */}
        {showFallbackUpload && (cameraState.status === "idle" || cameraState.status === "error") && !capturedImage && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                ou
              </span>
            </div>
          </div>
        )}

        {showFallbackUpload && (cameraState.status === "idle" || cameraState.status === "error") && !capturedImage && (
          <>
            <button
              onClick={openFilePicker}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-500 dark:hover:border-violet-500 text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {t('cam_upload_photo')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Security & Consent Info */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {t('cam_data_protection')}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {t('cam_data_protection_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecureCamera;

