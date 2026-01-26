"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useNotification } from "@/contexts/NotificationContext";
import { 
  FiCamera, FiCheck, FiX, FiClock, FiCalendar, FiAlertTriangle, 
  FiMapPin, FiSmartphone, FiTrendingUp, FiActivity, FiUser,
  FiLogIn, FiLogOut, FiRefreshCw, FiEye
} from "react-icons/fi";
import { Button } from "@/components/ui/Button";

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
  const [pointageType, setPointageType] = useState<"IN" | "OUT">("IN");
  const [recentPointages, setRecentPointages] = useState<RecentPointage[]>([]);
  const [stats, setStats] = useState<PointageStats | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

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
    getDeviceInfo();
    getGeolocation();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getDeviceInfo = () => {
    const info = `${navigator.platform} - ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`;
    setDeviceInfo(info);
  };

  const getGeolocation = () => {
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
    if (!capturedImage) {
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Veuillez capturer une photo"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Step 1: Verify face in the captured image
      showNotification({
        type: "info",
        title: "Vérification en cours",
        message: "Vérification de votre visage..."
      });

      const faceVerifyResponse = await fetch("/api/face-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          userId: session?.user?.id
        })
      });

      const faceVerifyData = await faceVerifyResponse.json();

      if (!faceVerifyResponse.ok) {
        showNotification({
          type: "error",
          title: "Vérification indisponible",
          message: faceVerifyData.message || faceVerifyData.error || "Service de reconnaissance faciale indisponible"
        });
        setLoading(false);
        return;
      }

      if (!faceVerifyData.verified) {
        showNotification({
          type: "error",
          title: "Vérification échouée",
          message: faceVerifyData.message || "Visage non reconnu. Veuillez réessayer."
        });
        setLoading(false);
        return;
      }

      // Show confidence score
      if (faceVerifyData.confidence && faceVerifyData.confidence < 0.7) {
        showNotification({
          type: "warning",
          title: "Qualité moyenne",
          message: `Visage détecté avec ${Math.round(faceVerifyData.confidence * 100)}% de confiance. Essayez d'améliorer l'éclairage.`
        });
      }

      // Step 2: Get device fingerprint
      const deviceFingerprint = {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      };
      
      // Step 3: Get geolocation if available
      let geolocationData = geolocation || null;
      if (!geolocationData && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          geolocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setGeolocation(geolocationData);
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
          capturedPhoto: capturedImage,
          faceVerified: true,
          verificationScore: Math.round((faceVerifyData.confidence || 0.95) * 100),
          faceAttributes: faceVerifyData.faceAttributes,
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
        
        // Stop camera and reset
        stopCamera();
      } else {
        showNotification({
          type: "error",
          title: "Erreur",
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
                    <FiActivity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Session en cours</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Entrée: {todayStatus.checkInTime}</p>
                    </div>
                  </>
                ) : todayStatus.hasCheckedOut ? (
                  <>
                    <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Journée terminée</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {todayStatus.checkInTime} → {todayStatus.checkOutTime}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FiClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Prêt à pointer</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Démarrez la caméra pour commencer</p>
                    </div>
                  </>
                )}
              </div>
              {geolocation && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <FiMapPin className="w-4 h-4" />
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
                  <FiClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                  <FiLogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
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
                  <FiLogOut className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
                  <FiAlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
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
                  <FiCamera className="w-5 h-5" />
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
                    <FiLogIn className="w-6 h-6 inline mr-2" />
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
                    <FiLogOut className="w-6 h-6 inline mr-2" />
                    Check-Out
                  </button>
                </div>

                {/* Video/Image Display */}
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden mb-6 shadow-inner" style={{ aspectRatio: "16/9" }}>
                  {!capturing && !capturedImage && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                          <FiCamera className="w-12 h-12 text-white" />
                        </div>
                        <p className="text-xl font-semibold">Caméra désactivée</p>
                        <p className="text-sm opacity-75 mt-2">Cliquez sur "Démarrer la caméra" pour commencer</p>
                      </div>
                    </div>
                  )}
                  
                  {capturing && !capturedImage && (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-4 border-green-500 rounded-2xl pointer-events-none"></div>
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        EN DIRECT
                      </div>
                    </>
                  )}
                  
                  {capturedImage && (
                    <>
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                        <FiCheck className="w-4 h-4" />
                        PHOTO CAPTURÉE
                      </div>
                    </>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Device Info Overlay */}
                  {(capturing || capturedImage) && (
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-white">
                      <div className="bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <FiSmartphone className="w-3 h-3" />
                        {deviceInfo}
                      </div>
                      {geolocation && (
                        <div className="bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <FiMapPin className="w-3 h-3" />
                          GPS: {geolocation.lat.toFixed(4)}, {geolocation.lng.toFixed(4)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  {!capturing && !capturedImage && (
                    <Button
                      onClick={startCamera}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-4 text-lg font-bold shadow-lg"
                    >
                      <FiCamera className="w-6 h-6 mr-2" />
                      Démarrer la Caméra
                    </Button>
                  )}
                  
                  {capturing && !capturedImage && (
                    <>
                      <Button
                        onClick={capturePhoto}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 text-lg font-bold shadow-lg"
                      >
                        <FiCamera className="w-6 h-6 mr-2" />
                        Capturer
                      </Button>
                      <Button
                        onClick={stopCamera}
                        className="px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-4"
                      >
                        <FiX className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  
                  {capturedImage && (
                    <>
                      <Button
                        onClick={submitPointage}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 text-lg font-bold shadow-lg"
                      >
                        {loading ? (
                          <>
                            <FiRefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <FiCheck className="w-6 h-6 mr-2" />
                            Valider {pointageType === "IN" ? "Check-In" : "Check-Out"}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setCapturedImage(null);
                          setCapturing(true);
                        }}
                        className="px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-4"
                      >
                        <FiRefreshCw className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Help Text */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <FiEye className="w-4 h-4" />
                    <span className="font-medium">Conseils:</span> Assurez-vous d'avoir un bon éclairage et que votre visage est bien visible dans le cadre.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - History & Stats */}
          <div className="space-y-6">
            {/* Performance Card */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5" />
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
                  <FiCalendar className="w-5 h-5" />
                  Historique Récent
                </h3>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {recentPointages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FiClock className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
                                <FiAlertTriangle className={`w-5 h-5 ${
                                  pointage.anomalyDetected ? 'text-red-600' : ''
                                }`} />
                              ) : pointage.type === 'IN' ? (
                                <FiLogIn className="w-5 h-5 text-green-600" />
                              ) : (
                                <FiLogOut className="w-5 h-5 text-blue-600" />
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
