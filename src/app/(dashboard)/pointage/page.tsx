"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useNotification } from "@/contexts/NotificationContext";
import { 
  Camera, Check, X, Clock, Calendar, AlertTriangle, 
  MapPin, Smartphone, TrendingUp, Activity, User,
  LogIn, LogOut, RefreshCw, Eye, Shield, Upload
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SecureCamera } from "@/components/camera/SecureCamera";
import { 
  generateDeviceFingerprint, 
  getBasicDeviceInfo, 
  getGeolocation,
  storeTrustedDevice,
  isDeviceTrusted,
  calculateTrustLevel
} from "@/lib/services/device-fingerprint";

interface PointageStats {
  month: number;
  year: number;
  totalHours: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  anomalies: number;
  averageCheckInTime?: string;
  averageCheckOutTime?: string;
  daysPresent?: number;
  daysAbsent?: number;
}

interface TodayStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: number;
}

interface RecentPointage {
  id: string;
  type: string;
  timestamp: string;
  anomalyDetected: boolean;
  anomalyReason?: string;
  status: string;
  geolocation?: string;
}

export default function PointagePage() {
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureMethod, setCaptureMethod] = useState<"camera" | "upload" | null>(null);
  const [pointageType, setPointageType] = useState<"IN" | "OUT">("IN");
  const [recentPointages, setRecentPointages] = useState<RecentPointage[]>([]);
  const [stats, setStats] = useState<PointageStats | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [useSecureCamera, setUseSecureCamera] = useState(true);
  const [deviceTrusted, setDeviceTrusted] = useState(false);

  // Horloge en temps réel
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAllData();
    initializeDevice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize device info and check trust status
  const initializeDevice = async () => {
    try {
      // Get basic device info for display
      const basicInfo = getBasicDeviceInfo();
      setDeviceInfo(`${basicInfo.type} - ${basicInfo.os} - ${basicInfo.browser}`);

      // Check if device is trusted
      const trusted = await isDeviceTrusted();
      setDeviceTrusted(trusted);

      // Get geolocation
      const geo = await getGeolocation();
      if (geo) {
        setGeolocation(geo);
      }
    } catch (error) {
      console.error("Error initializing device:", error);
      setDeviceInfo(`${navigator.platform} - ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`);
    }
  };

  const getDeviceInfo = () => {
    const info = `${navigator.platform} - ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`;
    setDeviceInfo(info);
  };

  const getGeolocationData = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.log("Geolocation not available:", error);
        }
      );
    }
  };

  // Handle capture from SecureCamera component
  const handleSecureCameraCapture = useCallback((imageData: string, method: "camera" | "upload") => {
    setCapturedImage(imageData);
    setCaptureMethod(method);
    setUseSecureCamera(false);
    
    showNotification({
      type: "success",
      title: method === "camera" ? "Photo capturée" : "Photo téléchargée",
      message: "Votre photo est prête pour la vérification"
    });
  }, [showNotification]);

  // Handle camera error from SecureCamera
  const handleCameraError = useCallback((error: string) => {
    showNotification({
      type: "warning",
      title: "Problème caméra",
      message: error
    });
  }, [showNotification]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchRecentPointages(),
      fetchStats(),
      fetchTodayStatus()
    ]);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const fetchTodayStatus = async () => {
    try {
      const response = await fetch("/api/pointage-simple/today-status");
      if (response.ok) {
        const data = await response.json();
        setTodayStatus(data);
        if (data.hasCheckedIn && !data.hasCheckedOut) {
          setPointageType("OUT");
        } else {
          setPointageType("IN");
        }
      }
    } catch (error) {
      console.error("Error checking today status:", error);
    }
  };

  const startCamera = async () => {
    try {
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        showNotification({
          type: "error",
          title: "Caméra non supportée",
          message: "Votre navigateur ne supporte pas l'accès à la caméra."
        });
        return;
      }

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      });

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStream(mediaStream);
      setCapturing(true);

      showNotification({
        type: "success",
        title: "Caméra activée",
        message: "Positionnez votre visage et capturez la photo"
      });
    } catch (error: any) {
      console.error("Camera error:", error);
      
      let errorMessage = "Impossible d'accéder à la caméra.";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Permission refusée. Autorisez l'accès à la caméra dans les paramètres du navigateur.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Aucune caméra détectée sur cet appareil.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "La caméra est utilisée par une autre application.";
      }

      showNotification({
        type: "error",
        title: "Erreur caméra",
        message: errorMessage
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturing(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
  };

  const submitPointage = async () => {
    setLoading(true);
    
    try {
      // Step 1: Verify face in the captured image (if photo was taken)
      let faceVerifyData = { verified: false, confidence: 0 };
      
      if (capturedImage) {
        showNotification({
          type: "info",
          title: "Vérification en cours",
          message: "Vérification de votre visage..."
        });

        try {
          const faceVerifyResponse = await fetch("/api/face-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: capturedImage,
              userId: session?.user?.id,
              captureMethod: captureMethod // Track if from camera or upload
            })
          });

          if (faceVerifyResponse.ok) {
            faceVerifyData = await faceVerifyResponse.json();
            
            if (!faceVerifyData.verified) {
              showNotification({
                type: "warning",
                title: "Vérification faciale échouée",
                message: "Pointage enregistré sans vérification faciale"
              });
            }
          } else {
            showNotification({
              type: "warning",
              title: "Vérification faciale indisponible",
              message: "Pointage enregistré sans vérification faciale"
            });
          }
        } catch (faceError) {
          console.error("Face verification error:", faceError);
          showNotification({
            type: "warning",
            title: "Vérification faciale indisponible",
            message: "Pointage enregistré sans vérification faciale"
          });
        }
      } else {
        // No photo captured - pointage without photo
        showNotification({
          type: "info",
          title: "Pointage sans photo",
          message: "Enregistrement du pointage sans photo..."
        });
      }

      // Step 2: Get advanced device fingerprint
      let deviceFingerprint;
      try {
        deviceFingerprint = await generateDeviceFingerprint();
        
        // Calculate trust level
        const trustLevel = await calculateTrustLevel(deviceFingerprint);
        
        // If this is a successful pointage, mark device as trusted
        if (faceVerifyData.verified && trustLevel !== "high") {
          storeTrustedDevice(deviceFingerprint);
          setDeviceTrusted(true);
        }
      } catch (fpError) {
        console.error("Device fingerprint error:", fpError);
        // Fallback to basic fingerprint
        deviceFingerprint = {
          id: "unknown",
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        };
      }
      
      // Step 3: Get geolocation if available
      let geolocationData = geolocation || null;
      if (!geolocationData) {
        try {
          geolocationData = await getGeolocation();
          if (geolocationData) {
            setGeolocation(geolocationData);
          }
        } catch (error) {
          console.log("Geolocation not available");
        }
      }
      
      // Step 4: Submit pointage with verification data
      const endpoint = pointageType === "IN" ? "/api/pointage-simple/check-in" : "/api/pointage-simple/check-out";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceFingerprint,
          geolocation: geolocationData,
          capturedPhoto: capturedImage || null,
          captureMethod: captureMethod || null,
          faceVerified: faceVerifyData.verified || false,
          verificationScore: Math.round((faceVerifyData.confidence || 0) * 100),
          deviceTrusted: deviceTrusted,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showNotification({
          type: data.pointage.anomalyDetected ? "warning" : "success",
          title: pointageType === "IN" ? "✓ Check-in réussi" : "✓ Check-out réussi",
          message: data.message + (faceVerifyData.confidence ? ` (Confiance: ${Math.round(faceVerifyData.confidence * 100)}%)` : "")
        });
        
        // Refresh data
        await fetchAllData();
        
        // Reset state
        stopCamera();
        setCapturedImage(null);
        setCaptureMethod(null);
        setUseSecureCamera(true);
      } else {
        // Handle specific error codes
        let errorTitle = "Erreur";
        let errorType: "error" | "warning" = "error";
        
        if (data.code === "ALREADY_CHECKED_IN") {
          errorTitle = "Déjà pointé";
          errorType = "warning";
        } else if (data.code === "ALREADY_CHECKED_OUT") {
          errorTitle = "Déjà sorti";
          errorType = "warning";
        } else if (data.code === "NO_CHECK_IN") {
          errorTitle = "Check-in requis";
          errorType = "warning";
        } else if (data.code === "TOO_FREQUENT") {
          errorTitle = "Trop rapide";
          errorType = "warning";
        }
        
        showNotification({
          type: errorType,
          title: errorTitle,
          message: data.error || "Erreur lors de l'enregistrement"
        });
      }
    } catch (error) {
      console.error("Error submitting pointage:", error);
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Erreur de connexion"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPointages = async () => {
    try {
      const response = await fetch("/api/pointage-simple/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentPointages(data.pointages || []);
      }
    } catch (error) {
      console.error("Error fetching pointages:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/pointage-simple/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Clean Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Système de Pointage
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {session?.user?.name || session?.user?.email}
            </p>
          </div>
          
          {/* Clean Clock */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-[200px]">
            <div className="text-2xl font-bold text-gray-900 dark:text-white text-center" suppressHydrationWarning>
              {currentTime
                ? currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : "--:--:--"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1" suppressHydrationWarning>
              {currentTime
                ? currentTime.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                : "--"}
            </div>
          </div>
        </div>

        {/* Clean Status Banner */}
        {todayStatus && (
          <div className={`mb-6 rounded-lg border p-4 ${
            todayStatus.hasCheckedIn && !todayStatus.hasCheckedOut
              ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
              : todayStatus.hasCheckedOut
              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {todayStatus.hasCheckedIn && !todayStatus.hasCheckedOut ? (
                  <>
                    <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Session en cours</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Entrée: {todayStatus.checkInTime}</p>
                    </div>
                  </>
                ) : todayStatus.hasCheckedOut ? (
                  <>
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Journée terminée</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {todayStatus.checkInTime} → {todayStatus.checkOutTime}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Prêt à pointer</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Démarrez la caméra pour commencer</p>
                    </div>
                  </>
                )}
              </div>
              {geolocation && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>GPS actif</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Camera & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clean Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Heures</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalHours?.toFixed(1) || "0"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <LogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Entrées</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalCheckIns || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sorties</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalCheckOuts || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alertes</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.anomalies || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Camera Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Vérification Biométrique
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Capturez votre photo pour valider le pointage
                </p>
              </div>

              <div className="p-6">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPointageType("IN")}
                    disabled={todayStatus?.hasCheckedIn && !todayStatus?.hasCheckedOut}
                    className={`py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
                      pointageType === "IN"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-2xl"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md"
                    } ${todayStatus?.hasCheckedIn && !todayStatus?.hasCheckedOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <LogIn className="w-6 h-6 inline mr-2" />
                    Check-In
                  </button>
                  <button
                    onClick={() => setPointageType("OUT")}
                    disabled={!todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut}
                    className={`py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
                      pointageType === "OUT"
                        ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-2xl"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md"
                    } ${(!todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <LogOut className="w-6 h-6 inline mr-2" />
                    Check-Out
                  </button>
                </div>

                {/* Device Trust Badge */}
                {deviceTrusted && (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Appareil de confiance reconnu
                    </span>
                  </div>
                )}

                {/* SecureCamera Component or Preview */}
                {useSecureCamera && !capturedImage ? (
                  <SecureCamera
                    onCapture={handleSecureCameraCapture}
                    onError={handleCameraError}
                    disabled={loading}
                    showFallbackUpload={true}
                  />
                ) : capturedImage ? (
                  <>
                    {/* Captured Image Preview */}
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "4/3" }}>
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-bold">
                        <Check className="w-4 h-4" />
                        {captureMethod === "upload" ? "PHOTO TÉLÉCHARGÉE" : "PHOTO CAPTURÉE"}
                      </div>
                      {captureMethod === "upload" && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-amber-500/90 text-white px-3 py-1.5 rounded-full text-xs font-medium">
                          <Upload className="w-3 h-3" />
                          Mode Upload
                        </div>
                      )}
                      {/* Device Info Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-white">
                        <div className="bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <Smartphone className="w-3 h-3" />
                          {deviceInfo}
                        </div>
                        {geolocation && (
                          <div className="bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            GPS: {geolocation.lat.toFixed(4)}, {geolocation.lng.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Captured Image Controls */}
                    <div className="flex gap-3">
                      <Button
                        onClick={submitPointage}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 text-lg font-bold shadow-lg"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Vérification...
                          </>
                        ) : (
                          <>
                            <Check className="w-6 h-6 mr-2" />
                            Valider {pointageType === "IN" ? "Check-In" : "Check-Out"}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setCapturedImage(null);
                          setCaptureMethod(null);
                          setUseSecureCamera(true);
                        }}
                        className="px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-4"
                      >
                        <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </Button>
                    </div>
                  </>
                ) : null}

                {/* Option to pointage without photo */}
                {useSecureCamera && !capturedImage && (
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          ou pointage rapide
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={submitPointage}
                      disabled={loading}
                      className="w-full mt-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 font-medium"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Pointer sans photo (confiance réduite)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - History & Stats */}
          <div className="space-y-6">
            {/* Performance Card */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance du Mois
              </h3>
              <div className="space-y-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm opacity-90">Jours présents</span>
                    <span className="font-bold text-lg">{stats?.daysPresent || 0}</span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${((stats?.daysPresent || 0) / 22) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-90">Moyenne entrée</span>
                  <span className="font-bold">{stats?.averageCheckInTime || '--:--'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-90">Moyenne sortie</span>
                  <span className="font-bold">{stats?.averageCheckOutTime || '--:--'}</span>
                </div>
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 p-5 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Historique Récent
                </h3>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {recentPointages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun pointage récent</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPointages.map((pointage, index) => (
                      <div
                        key={pointage.id || index}
                        className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                          pointage.anomalyDetected
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                            : pointage.type === 'IN'
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              pointage.anomalyDetected
                                ? 'bg-red-100 dark:bg-red-900/30'
                                : pointage.type === 'IN'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {pointage.anomalyDetected ? (
                                <AlertTriangle className={`w-5 h-5 ${
                                  pointage.anomalyDetected ? 'text-red-600' : ''
                                }`} />
                              ) : pointage.type === 'IN' ? (
                                <LogIn className="w-5 h-5 text-green-600" />
                              ) : (
                                <LogOut className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className={`font-semibold ${
                                pointage.anomalyDetected ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'
                              }`}>
                                {pointage.type === 'IN' ? 'Check-In' : 'Check-Out'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(pointage.timestamp).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {pointage.anomalyDetected && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  ⚠️ {pointage.anomalyReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pointage.status === 'VALID'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {pointage.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    </div>
  );
}

