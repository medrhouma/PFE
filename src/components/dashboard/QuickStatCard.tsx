/**
 * Quick Stats Card Component
 * Reusable statistics card with various display modes
 */

"use client";

import { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface QuickStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
    direction?: "up" | "down" | "neutral";
  };
  color?: "blue" | "green" | "orange" | "red" | "purple" | "gray";
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-300",
    gradient: "from-blue-500 to-blue-600",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    icon: "text-green-600 dark:text-green-400",
    value: "text-green-700 dark:text-green-300",
    gradient: "from-green-500 to-green-600",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-700 dark:text-orange-300",
    gradient: "from-orange-500 to-orange-600",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    icon: "text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-300",
    gradient: "from-red-500 to-red-600",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    icon: "text-purple-600 dark:text-purple-400",
    value: "text-purple-700 dark:text-purple-300",
    gradient: "from-purple-500 to-purple-600",
  },
  gray: {
    bg: "bg-gray-50 dark:bg-gray-800",
    iconBg: "bg-gray-100 dark:bg-gray-700",
    icon: "text-gray-600 dark:text-gray-400",
    value: "text-gray-700 dark:text-gray-300",
    gradient: "from-gray-500 to-gray-600",
  },
};

export default function QuickStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
  loading = false,
  onClick,
  className = "",
}: QuickStatCardProps) {
  const colors = colorClasses[color];

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.direction === "up") return "text-green-600 dark:text-green-400";
    if (trend.direction === "down") return "text-red-600 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const TrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === "up") return <ArrowUp className="w-4 h-4" />;
    if (trend.direction === "down") return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 
        p-6 transition-all duration-200 
        ${onClick ? "cursor-pointer hover:shadow-xl hover:-translate-y-1" : ""} 
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>

          {/* Value */}
          {loading ? (
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className={`text-3xl font-bold ${colors.value}`}>
              {value}
            </p>
          )}

          {/* Subtitle and Trend */}
          <div className="flex items-center gap-3 mt-2">
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                <TrendIcon />
                <span>{trend.value}%</span>
                {trend.label && (
                  <span className="text-gray-400 font-normal">{trend.label}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Icon */}
        {icon && (
          <div className={`w-14 h-14 rounded-xl ${colors.iconBg} flex items-center justify-center shadow-inner`}>
            <div className={colors.icon}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact stat card variant
 */
export function CompactStatCard({
  title,
  value,
  icon,
  color = "blue",
  loading = false,
  onClick,
  className = "",
}: Omit<QuickStatCardProps, "subtitle" | "trend">) {
  const colors = colorClasses[color];

  return (
    <div
      className={`
        ${colors.bg} rounded-xl p-4 transition-all duration-200 
        ${onClick ? "cursor-pointer hover:scale-105" : ""} 
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
            <div className={colors.icon}>
              {icon}
            </div>
          </div>
        )}
        <div>
          {loading ? (
            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          ) : (
            <p className={`text-xl font-bold ${colors.value}`}>{value}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Progress stat card with bar
 */
export function ProgressStatCard({
  title,
  value,
  total,
  icon,
  color = "blue",
  loading = false,
  className = "",
}: {
  title: string;
  value: number;
  total: number;
  icon?: ReactNode;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "gray";
  loading?: boolean;
  className?: string;
}) {
  const colors = colorClasses[color];
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
            <div className={colors.icon}>
              {icon}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-3xl font-bold ${colors.value}`}>{value}</span>
            <span className="text-gray-400 dark:text-gray-500">/ {total}</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {percentage}% complété
          </p>
        </>
      )}
    </div>
  );
}
