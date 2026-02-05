"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SignaturePad, ContractCard } from "@/components/contracts/ContractComponents";
import { FileText, CheckCircle, Clock, Send, AlertCircle, X } from "lucide-react";

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
    title: "Mes Contrats",
    subtitle: "Gérez et signez vos contrats",
    pending: "En attente de signature",
    signed: "Signés",
    all: "Tous",
    noContracts: "Aucun contrat disponible",
    signContract: "Signer le contrat",
    viewContract: "Voir le contrat",
    downloadSigned: "Télécharger le contrat signé",
    signatureRequired: "Signature requise",
    confirmSignature: "Confirmer la signature",
    cancel: "Annuler",
    clear: "Effacer",
    signatureSuccess: "Contrat signé avec succès !",
    signatureError: "Erreur lors de la signature",
    expiresOn: "Expire le",
    signedOn: "Signé le",
    sentOn: "Envoyé le",
    loading: "Chargement...",
    tabs: {
      pending: "En attente",
      signed: "Signés",
      all: "Tous",
    },
    status: {
      DRAFT: "Brouillon",
      SENT: "Envoyé",
      SIGNED: "Signé",
      ARCHIVED: "Archivé",
      EXPIRED: "Expiré",
    },
  },
  en: {
    title: "My Contracts",
    subtitle: "Manage and sign your contracts",
    pending: "Pending signature",
    signed: "Signed",
    all: "All",
    noContracts: "No contracts available",
    signContract: "Sign contract",
    viewContract: "View contract",
    downloadSigned: "Download signed contract",
    signatureRequired: "Signature required",
    confirmSignature: "Confirm signature",
    cancel: "Cancel",
    clear: "Clear",
    signatureSuccess: "Contract signed successfully!",
    signatureError: "Error signing contract",
    expiresOn: "Expires on",
    signedOn: "Signed on",
    sentOn: "Sent on",
    loading: "Loading...",
    tabs: {
      pending: "Pending",
      signed: "Signed",
      all: "All",
    },
    status: {
      DRAFT: "Draft",
      SENT: "Sent",
      SIGNED: "Signed",
      ARCHIVED: "Archived",
      EXPIRED: "Expired",
    },
  },
  ar: {
    title: "عقودي",
    subtitle: "إدارة وتوقيع عقودك",
    pending: "في انتظار التوقيع",
    signed: "موقعة",
    all: "الكل",
    noContracts: "لا توجد عقود",
    signContract: "توقيع العقد",
    viewContract: "عرض العقد",
    downloadSigned: "تحميل العقد الموقع",
    signatureRequired: "التوقيع مطلوب",
    confirmSignature: "تأكيد التوقيع",
    cancel: "إلغاء",
    clear: "مسح",
    signatureSuccess: "تم توقيع العقد بنجاح!",
    signatureError: "خطأ في التوقيع",
    expiresOn: "ينتهي في",
    signedOn: "تم التوقيع في",
    sentOn: "أرسل في",
    loading: "جاري التحميل...",
    tabs: {
      pending: "قيد الانتظار",
      signed: "موقعة",
      all: "الكل",
    },
    status: {
      DRAFT: "مسودة",
      SENT: "مرسل",
      SIGNED: "موقع",
      ARCHIVED: "مؤرشف",
      EXPIRED: "منتهي",
    },
  },
};

export default function ContractsPage() {
  const { data: session } = useSession();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.fr;
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "signed" | "all">("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/contracts");
      const data = await response.json();
      
      if (data.success) {
        setContracts(data.data || []);
      } else {
        setError(data.error || "Failed to fetch contracts");
      }
    } catch (err) {
      console.error("Error fetching contracts:", err);
      setError("Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchContracts();
    }
  }, [session, fetchContracts]);

  const handleSign = async () => {
    if (!selectedContract || !signature) return;

    try {
      setSigning(true);
      setError(null);

      const response = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          signature,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t.signatureSuccess);
        setShowSignModal(false);
        setSelectedContract(null);
        setSignature(null);
        fetchContracts();
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || t.signatureError);
      }
    } catch (err) {
      console.error("Error signing contract:", err);
      setError(t.signatureError);
    } finally {
      setSigning(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    if (activeTab === "pending") return contract.status === "SENT";
    if (activeTab === "signed") return contract.status === "SIGNED";
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SIGNED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "SENT":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "DRAFT":
        return <FileText className="w-5 h-5 text-gray-500" />;
      case "EXPIRED":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SIGNED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "SENT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "EXPIRED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t.title}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t.subtitle}</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {(["all", "pending", "signed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {t.tabs[tab]}
              {tab === "pending" && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                  {contracts.filter((c) => c.status === "SENT").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t.noContracts}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(contract.status)}
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {contract.title}
                  </h3>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    contract.status
                  )}`}
                >
                  {t.status[contract.status as keyof typeof t.status] || contract.status}
                </span>
              </div>

              {contract.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {contract.description}
                </p>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1 mb-4">
                {contract.sentAt && (
                  <p>
                    {t.sentOn}: {new Date(contract.sentAt).toLocaleDateString()}
                  </p>
                )}
                {contract.signedAt && (
                  <p>
                    {t.signedOn}: {new Date(contract.signedAt).toLocaleDateString()}
                  </p>
                )}
                {contract.expiresAt && (
                  <p>
                    {t.expiresOn}: {new Date(contract.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {contract.fileUrl && (
                  <a
                    href={contract.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 text-center transition-colors"
                  >
                    {t.viewContract}
                  </a>
                )}
                {contract.status === "SENT" && (
                  <button
                    onClick={() => {
                      setSelectedContract(contract);
                      setShowSignModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {t.signContract}
                  </button>
                )}
                {contract.signedFileUrl && (
                  <a
                    href={contract.signedFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 text-center transition-colors"
                  >
                    {t.downloadSigned}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature Modal */}
      {showSignModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t.signatureRequired}
              </h2>
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSelectedContract(null);
                  setSignature(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedContract.title}
            </p>

            <SignaturePad
              onSave={(sig) => setSignature(sig)}
              onCancel={() => {
                setShowSignModal(false);
                setSelectedContract(null);
                setSignature(null);
              }}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSelectedContract(null);
                  setSignature(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSign}
                disabled={!signature || signing}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {signing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {t.confirmSignature}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
