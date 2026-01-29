/**
 * ExportButton Component
 * Professional export button with dropdown menu for different export types
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useExport, ExportOptions } from "@/hooks/useExport";
import { Download, ChevronDown, FileText, Users, Calendar, Clock, Shield } from "lucide-react";

interface ExportButtonProps {
  /** Available export types for this button */
  types?: Array<'employees' | 'pointages' | 'conges' | 'audit' | 'monthly' | 'personal'>;
  /** Default date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Custom filters */
  filters?: {
    status?: string;
    department?: string;
    userId?: string;
  };
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
  /** Show as dropdown or single button */
  dropdown?: boolean;
  /** Single export type (when dropdown is false) */
  singleType?: 'employees' | 'pointages' | 'conges' | 'audit' | 'monthly' | 'personal';
}

const exportTypeLabels: Record<string, { label: string; icon: any; description: string }> = {
  employees: {
    label: 'Liste des employés',
    icon: Users,
    description: 'Exporter tous les employés'
  },
  pointages: {
    label: 'Historique pointages',
    icon: Clock,
    description: 'Exporter les pointages'
  },
  conges: {
    label: 'Demandes de congés',
    icon: Calendar,
    description: 'Exporter les congés'
  },
  audit: {
    label: 'Logs d\'audit',
    icon: Shield,
    description: 'Exporter les logs système'
  },
  monthly: {
    label: 'Rapport mensuel',
    icon: FileText,
    description: 'Rapport mensuel complet'
  },
  personal: {
    label: 'Mon relevé personnel',
    icon: FileText,
    description: 'Votre relevé de pointage'
  }
};

export default function ExportButton({
  types = ['pointages', 'conges', 'personal'],
  dateRange,
  filters,
  variant = 'primary',
  size = 'md',
  className = '',
  dropdown = true,
  singleType,
}: ExportButtonProps) {
  const { exportData, isExporting, error, canExport } = useExport();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter types based on permissions
  const availableTypes = types.filter(type => canExport(type));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (type: typeof types[number]) => {
    const options: ExportOptions = {
      type,
      format: 'csv',
      filters,
    };

    if (dateRange) {
      options.dateRange = dateRange;
    }

    if (type === 'monthly' || type === 'personal') {
      options.year = selectedYear;
      options.month = selectedMonth;
    }

    await exportData(options);
    setIsOpen(false);
  };

  // Handle single button export (non-dropdown)
  const handleSingleExport = async () => {
    if (singleType) {
      await handleExport(singleType);
    }
  };

  // Base button classes
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:hover:bg-blue-900/20"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2 text-base gap-2",
    lg: "px-6 py-3 text-lg gap-2.5"
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (availableTypes.length === 0) {
    return null; // Don't render if user can't export anything
  }

  // Single button mode
  if (!dropdown && singleType) {
    const typeInfo = exportTypeLabels[singleType];
    const Icon = typeInfo?.icon || Download;

    return (
      <button
        onClick={handleSingleExport}
        disabled={isExporting}
        className={buttonClasses}
        title={typeInfo?.description}
      >
        {isExporting ? (
          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        <span>Exporter</span>
      </button>
    );
  }

  // Dropdown mode
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={buttonClasses}
      >
        {isExporting ? (
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Exporter</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Month/Year selector for monthly reports */}
          {(availableTypes.includes('monthly') || availableTypes.includes('personal')) && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Période pour les rapports
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Export options */}
          <div className="py-1">
            {availableTypes.map((type) => {
              const typeInfo = exportTypeLabels[type];
              const Icon = typeInfo?.icon || Download;

              return (
                <button
                  key={type}
                  onClick={() => handleExport(type)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {typeInfo?.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {typeInfo?.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple export button for specific data type
 */
export function SimpleExportButton({
  type,
  label,
  ...props
}: {
  type: 'employees' | 'pointages' | 'conges' | 'audit' | 'monthly' | 'personal';
  label?: string;
} & Omit<ExportButtonProps, 'types' | 'dropdown' | 'singleType'>) {
  return (
    <ExportButton
      {...props}
      dropdown={false}
      singleType={type}
    />
  );
}
