"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotification } from "@/contexts/NotificationContext";
import { 
  FileText, Pen, Check, X, RotateCcw, Download, 
  ChevronLeft, Loader2, AlertCircle, ZoomIn, ZoomOut 
} from "lucide-react";
import Link from "next/link";

interface Contract {
  id: string;
  title: string;
  description?: string;
  status: string;
  type: string;
  fileUrl?: string;
  signedFileUrl?: string;
  sentAt?: string;
  signedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

const translations = {
  fr: {
    back: "Retour aux contrats",
    loading: "Chargement du contrat...",
    notFound: "Contrat introuvable",
    notFoundDesc: "Le contrat demandé n'existe pas ou vous n'y avez pas accès.",
    contractDetails: "Détails du contrat",
    pdfPreview: "Aperçu du document",
    signatureArea: "Zone de signature",
    drawSignature: "Dessinez votre signature ci-dessous",
    clearSignature: "Effacer",
    submitSignature: "Signer le contrat",
    signing: "Signature en cours...",
    signed: "Contrat signé !",
    signedOn: "Signé le",
    downloadSigned: "Télécharger le contrat signé",
    cannotSign: "Signature non disponible",
    alreadySigned: "Ce contrat a déjà été signé.",
    status: {
      DRAFT: "Brouillon",
      SENT: "Envoyé",
      VIEWED: "Consulté",
      SIGNED: "Signé",
      ARCHIVED: "Archivé",
      CANCELLED: "Annulé",
    },
    signatureRequired: "Veuillez dessiner votre signature",
    signSuccess: "Contrat signé avec succès !",
    signError: "Erreur lors de la signature",
    zoomIn: "Zoomer",
    zoomOut: "Dézoomer",
    page: "Page",
    of: "sur",
  },
  en: {
    back: "Back to contracts",
    loading: "Loading contract...",
    notFound: "Contract not found",
    notFoundDesc: "The requested contract does not exist or you don't have access.",
    contractDetails: "Contract details",
    pdfPreview: "Document preview",
    signatureArea: "Signature area",
    drawSignature: "Draw your signature below",
    clearSignature: "Clear",
    submitSignature: "Sign contract",
    signing: "Signing...",
    signed: "Contract signed!",
    signedOn: "Signed on",
    downloadSigned: "Download signed contract",
    cannotSign: "Signature unavailable",
    alreadySigned: "This contract has already been signed.",
    status: {
      DRAFT: "Draft",
      SENT: "Sent",
      VIEWED: "Viewed",
      SIGNED: "Signed",
      ARCHIVED: "Archived",
      CANCELLED: "Cancelled",
    },
    signatureRequired: "Please draw your signature",
    signSuccess: "Contract signed successfully!",
    signError: "Error signing contract",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    page: "Page",
    of: "of",
  },
  ar: {
    back: "العودة إلى العقود",
    loading: "جاري تحميل العقد...",
    notFound: "العقد غير موجود",
    notFoundDesc: "العقد المطلوب غير موجود أو ليس لديك صلاحية الوصول.",
    contractDetails: "تفاصيل العقد",
    pdfPreview: "معاينة المستند",
    signatureArea: "منطقة التوقيع",
    drawSignature: "ارسم توقيعك أدناه",
    clearSignature: "مسح",
    submitSignature: "توقيع العقد",
    signing: "جاري التوقيع...",
    signed: "تم توقيع العقد!",
    signedOn: "تم التوقيع في",
    downloadSigned: "تحميل العقد الموقع",
    cannotSign: "التوقيع غير متاح",
    alreadySigned: "تم توقيع هذا العقد بالفعل.",
    status: {
      DRAFT: "مسودة",
      SENT: "مرسل",
      VIEWED: "تمت المعاينة",
      SIGNED: "موقع",
      ARCHIVED: "مؤرشف",
      CANCELLED: "ملغى",
    },
    signatureRequired: "يرجى رسم توقيعك",
    signSuccess: "تم توقيع العقد بنجاح!",
    signError: "خطأ في التوقيع",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    page: "صفحة",
    of: "من",
  },
};

export default function ContractSignaturePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { language } = useLanguage();
  const { showNotification } = useNotification();
  const t = translations[language as keyof typeof translations] || translations.fr;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);

  // Fetch contract details
  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${id}`);
      const data = await response.json();

      if (response.ok) {
        // API returns contract directly or in data property
        const contractData = data.data || data;
        
        // Map API response to our interface
        setContract({
          id: contractData.id,
          title: contractData.title,
          description: contractData.description,
          status: contractData.status,
          type: contractData.type,
          fileUrl: contractData.original_pdf_path || contractData.fileUrl,
          signedFileUrl: contractData.signed_pdf_path || contractData.signedFileUrl,
          sentAt: contractData.sent_at || contractData.sentAt,
          signedAt: contractData.signed_at || contractData.signedAt,
          expiresAt: contractData.valid_until || contractData.expiresAt,
          createdAt: contractData.created_at || contractData.createdAt,
          updatedAt: contractData.updated_at || contractData.updatedAt,
        });
      } else {
        setError(data.error || t.notFound);
      }
    } catch (err) {
      console.error("Error fetching contract:", err);
      setError(t.notFound);
    } finally {
      setLoading(false);
    }
  }, [id, t.notFound]);

  useEffect(() => {
    if (session?.user && id) {
      fetchContract();
    }
  }, [session, id, fetchContract]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Set drawing style
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [contract]);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (contract?.status === "SIGNED") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const handleSign = async () => {
    if (!hasSignature) {
      showNotification({
        type: "warning",
        title: t.signatureRequired,
        message: t.drawSignature,
      });
      return;
    }

    const signatureData = getSignatureData();
    if (!signatureData) return;

    try {
      setSigning(true);
      setError(null);

      const response = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          signatureData: signatureData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification({
          type: "success",
          title: t.signed,
          message: t.signSuccess,
        });
        // Refresh contract data
        await fetchContract();
      } else {
        setError(data.error || t.signError);
        showNotification({
          type: "error",
          title: t.signError,
          message: data.error || t.signError,
        });
      }
    } catch (err) {
      console.error("Error signing contract:", err);
      setError(t.signError);
    } finally {
      setSigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SIGNED":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "SENT":
      case "VIEWED":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "DRAFT":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      case "ARCHIVED":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "CANCELLED":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.notFound}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t.notFoundDesc}</p>
          <Link
            href="/contracts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/contracts"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">{t.back}</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600" />
                  {contract.title}
                </h1>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getStatusColor(contract.status)}`}>
                  {t.status[contract.status as keyof typeof t.status] || contract.status}
                </span>
              </div>
            </div>

            {contract.status === "SIGNED" && contract.signedFileUrl && (
              <a
                href={contract.signedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t.downloadSigned}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - PDF Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                {t.pdfPreview}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))}
                  className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                  title={t.zoomOut}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px] text-center">{pdfZoom}%</span>
                <button
                  onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))}
                  className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                  title={t.zoomIn}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 h-[600px] overflow-auto bg-gray-100 dark:bg-gray-900">
              {contract.fileUrl ? (
                <iframe
                  src={contract.fileUrl}
                  className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
                  style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top left" }}
                  title="Contract PDF"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Document non disponible</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right - Signature Area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Pen className="w-5 h-5 text-violet-600" />
                {t.signatureArea}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Contract Details */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">{t.contractDetails}</h3>
                {contract.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{contract.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="ml-1 text-gray-900 dark:text-white font-medium">{contract.type}</span>
                  </div>
                  {contract.sentAt && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Envoyé:</span>
                      <span className="ml-1 text-gray-900 dark:text-white font-medium">
                        {new Date(contract.sentAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                  {contract.signedAt && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t.signedOn}:</span>
                      <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                        {new Date(contract.signedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Canvas or Already Signed Message */}
              {contract.status === "SIGNED" ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <Check className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">{t.signed}</h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">{t.alreadySigned}</p>
                </div>
              ) : contract.status === "SENT" || contract.status === "VIEWED" ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.drawSignature}</p>
                  
                  {/* Signature Canvas */}
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 cursor-crosshair touch-none"
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-400 dark:text-gray-500 text-sm">{t.drawSignature}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={clearSignature}
                      disabled={!hasSignature || signing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t.clearSignature}
                    </button>
                    <button
                      onClick={handleSign}
                      disabled={!hasSignature || signing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {signing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t.signing}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {t.submitSignature}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
                  <X className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{t.cannotSign}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Status: {t.status[contract.status as keyof typeof t.status] || contract.status}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
