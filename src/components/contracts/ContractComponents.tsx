"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Pen, RotateCcw, Check, X, Download, 
  FileText, Eye, Send, Archive
} from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

/**
 * SignaturePad Component
 * Canvas-based signature capture for contract signing
 */
export function SignaturePad({ onSave, onCancel, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Retina support
    canvas.height = rect.height * 2;
    context.scale(2, 2);

    // Configure drawing style
    context.strokeStyle = "#1e3a5f";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    // White background
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    setCtx(context);
  }, []);

  // Get coordinates from event
  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !ctx) return;
    
    e.preventDefault();
    setIsDrawing(true);
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [ctx, disabled, getCoordinates]);

  // Draw
  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || !ctx) return;
    
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, ctx, disabled, getCoordinates]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (!ctx) return;
    setIsDrawing(false);
    ctx.closePath();
  }, [ctx]);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    setHasSignature(false);
  }, [ctx]);

  // Save signature
  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL("image/png", 0.9);
    onSave(signatureData);
  }, [hasSignature, onSave]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Pen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Signez ici
          </h3>
        </div>
        <button
          onClick={clearSignature}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Effacer
        </button>
      </div>

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
          className={`
            w-full h-48 border-2 border-dashed rounded-lg cursor-crosshair
            ${hasSignature 
              ? "border-blue-400 dark:border-blue-500" 
              : "border-gray-300 dark:border-gray-600"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          style={{ touchAction: "none" }}
        />
        
        {/* Placeholder text */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Dessinez votre signature ici
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={saveSignature}
          disabled={!hasSignature || disabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${hasSignature && !disabled
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          <Check className="w-4 h-4" />
          Confirmer la signature
        </button>
      </div>
    </div>
  );
}

interface ContractCardProps {
  contract: {
    id: string;
    title: string;
    type: string;
    status: string;
    created_at: string;
    sent_at?: string;
    viewed_at?: string;
    signed_at?: string;
    userName?: string;
  };
  userRole: "USER" | "RH" | "SUPER_ADMIN";
  onView: () => void;
  onSign?: () => void;
  onSend?: () => void;
  onArchive?: () => void;
  onDownload?: () => void;
}

/**
 * ContractCard Component
 * Displays contract information with status and actions
 */
export function ContractCard({
  contract,
  userRole,
  onView,
  onSign,
  onSend,
  onArchive,
  onDownload
}: ContractCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
      case "SENT": return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "VIEWED": return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "SIGNED": return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "ARCHIVED": return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      case "CANCELLED": return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT": return "Brouillon";
      case "SENT": return "Envoyé";
      case "VIEWED": return "Consulté";
      case "SIGNED": return "Signé";
      case "ARCHIVED": return "Archivé";
      case "CANCELLED": return "Annulé";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CDI": return "CDI";
      case "CDD": return "CDD";
      case "Stage": return "Stage";
      case "Freelance": return "Freelance";
      default: return type;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {contract.title}
            </h3>
            {contract.userName && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contract.userName}
              </p>
            )}
          </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
          {getStatusLabel(contract.status)}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Type</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {getTypeLabel(contract.type)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Créé le</span>
          <span className="text-gray-700 dark:text-gray-300">
            {new Date(contract.created_at).toLocaleDateString("fr-FR")}
          </span>
        </div>
        {contract.signed_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Signé le</span>
            <span className="text-green-600 dark:text-green-400">
              {new Date(contract.signed_at).toLocaleDateString("fr-FR")}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          Voir
        </button>
        
        {/* User can sign if status is SENT or VIEWED */}
        {userRole === "USER" && (contract.status === "SENT" || contract.status === "VIEWED") && onSign && (
          <button
            onClick={onSign}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Pen className="w-4 h-4" />
            Signer
          </button>
        )}
        
        {/* RH can send if status is DRAFT */}
        {(userRole === "RH" || userRole === "SUPER_ADMIN") && contract.status === "DRAFT" && onSend && (
          <button
            onClick={onSend}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            Envoyer
          </button>
        )}
        
        {/* Download if signed */}
        {contract.status === "SIGNED" && onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
        
        {/* RH can archive if signed */}
        {(userRole === "RH" || userRole === "SUPER_ADMIN") && contract.status === "SIGNED" && onArchive && (
          <button
            onClick={onArchive}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Archive className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default SignaturePad;
