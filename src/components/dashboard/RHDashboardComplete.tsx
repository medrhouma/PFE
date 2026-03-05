/**
 * RH Dashboard Component
 * Complete dashboard for RH role with all management features
 */

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from '@/contexts/LanguageContext';

interface RHDashboardStats {
  employees: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  attendance: {
    today: { present: number; total: number };
    thisWeek: number;
    anomalies: number;
  };
  leaves: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  system: {
    anomalies: number;
    notifications: number;
  };
}

interface PendingItem {
  id: string;
  type: "employee" | "leave" | "anomaly";
  name: string;
  description: string;
  date: Date;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

export default function RHDashboardComplete() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, language } = useLanguage();
  const locale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR';
  const [stats, setStats] = useState<RHDashboardStats | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "employees" | "leaves" | "anomalies">("overview");

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
      fetchPendingItems();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/rh/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingItems = async () => {
    try {
      const response = await fetch("/api/rh/pending-items");
      if (response.ok) {
        const data = await response.json();
        setPendingItems(data);
      }
    } catch (error) {
      console.error("Error fetching pending items:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 border-red-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "NORMAL":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "LOW":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "employee":
        return "👤";
      case "leave":
        return "🏖️";
      case "anomaly":
        return "⚠️";
      default:
        return "📋";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white">
                {t('rh_dashboard')}
              </h1>
              <p className="mt-2 text-blue-100">
                {t('rh_dashboard_overview')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/rh/employees/pending")}
                className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                {t('pending_employees')} ({stats?.employees.pending || 0})
              </button>
              <button
                onClick={() => router.push("/rh/notifications")}
                className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                {t('notifications')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 mb-8">
          <div className="flex gap-2">
            {[
              { id: "overview", label: t('overview'), icon: "📊" },
              { id: "employees", label: t('employees'), icon: "👥" },
              { id: "leaves", label: t('leave'), icon: "🏖️" },
              { id: "anomalies", label: t('anomalies'), icon: "⚠️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Employees */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('active_employees')}
                  </h3>
                  <span className="text-3xl">👥</span>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.employees.active || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('out_of')} {stats?.employees.total || 0} {t('total')}
                </p>
              </div>

              {/* Attendance Today */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('today_attendance')}
                  </h3>
                  <span className="text-3xl">📅</span>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats?.attendance.today.present || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('out_of')} {stats?.attendance.today.total || 0} {t('employees')}
                </p>
              </div>

              {/* Pending Leaves */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('pending_leave')}
                  </h3>
                  <span className="text-3xl">⏳</span>
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats?.leaves.pending || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('requests_to_process')}
                </p>
              </div>

              {/* Anomalies */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('active_anomalies')}
                  </h3>
                  <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {stats?.system.anomalies || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('to_review')}
                </p>
              </div>
            </div>

            {/* Pending Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('pending_actions')}
              </h2>
              <div className="space-y-3">
                {pendingItems.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    {t('no_pending_actions')}
                  </p>
                ) : (
                  pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border ${getPriorityColor(
                        item.priority
                      )}`}
                    >
                      <span className="text-3xl">{getTypeIcon(item.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.name}</h3>
                          <span className="text-xs px-2 py-1 rounded bg-white/50">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{item.description}</p>
                        <p className="text-xs mt-2 opacity-75">
                          {new Date(item.date).toLocaleString(locale)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (item.type === "employee")
                            router.push(`/rh/employees/${item.id}`);
                          else if (item.type === "leave")
                            router.push(`/rh/conges/${item.id}`);
                          else if (item.type === "anomaly")
                            router.push(`/rh/anomalies/${item.id}`);
                        }}
                        className="px-4 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        {t('process')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => router.push("/rh/employees")}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
              >
                <div className="text-4xl mb-3">👥</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('manage_employees')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('view_employees_manage_validations')}
                </p>
              </button>

              <button
                onClick={() => router.push("/rh/conges")}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
              >
                <div className="text-4xl mb-3">🏖️</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('leave_requests_label')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('approve_or_reject_requests')}
                </p>
              </button>

              <button
                onClick={() => router.push("/rh/anomalies")}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
              >
                <div className="text-4xl mb-3">⚠️</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('anomalies')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('review_resolve_anomalies')}
                </p>
              </button>
            </div>
          </>
        )}

        {/* Other tabs would have their specific content */}
        {activeTab === "employees" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{t('manage_employees')}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('employee_management_content')}
            </p>
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{t('leave_management')}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('leave_management_content')}
            </p>
          </div>
        )}

        {activeTab === "anomalies" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{t('anomaly_management')}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('anomaly_management_content')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
