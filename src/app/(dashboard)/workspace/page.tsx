"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Calendar, 
  Users, 
  Clock, 
  FileText, 
  TrendingUp, 
  Bell,
  LayoutGrid,
  CheckCircle,
  Clipboard,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  SplitScreenProvider, 
  SplitScreenContainer, 
  LayoutSelector 
} from '@/components/ui/SplitScreen'

// ============= Shared Hook for Workspace Data =============
function useWorkspaceData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspace');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setError(null);
      } else {
        setError('Erreur de chargement');
      }
    } catch (e) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refresh: fetchData };
}

// ============= Mini Widgets for Split Screen =============

// Quick Stats Widget
function QuickStatsWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const { data, loading } = useWorkspaceData();

  const stats = [
    { label: getText('Présent', 'Present'), value: data?.attendanceStats?.present || 0, color: 'text-green-600 bg-green-100', icon: <CheckCircle /> },
    { label: getText('Absent', 'Absent'), value: data?.attendanceStats?.absent || 0, color: 'text-red-600 bg-red-100', icon: <Clock /> },
    { label: getText('En congé', 'On Leave'), value: data?.attendanceStats?.onLeave || 0, color: 'text-blue-600 bg-blue-100', icon: <Calendar /> },
    { label: getText('En retard', 'Late'), value: data?.attendanceStats?.late || 0, color: 'text-amber-600 bg-amber-100', icon: <Activity /> },
  ]

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <PieChart className="text-violet-500" />
        {getText('Statistiques rapides', 'Quick Stats')}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className={`p-3 rounded-xl ${stat.color.split(' ')[1]} dark:bg-opacity-20`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={stat.color.split(' ')[0]}>{stat.icon}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pending Requests Widget
function PendingRequestsWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const { data, loading } = useWorkspaceData();

  const requests = data?.pendingRequests || [];

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Clipboard className="text-violet-500" />
        {getText('Demandes en attente', 'Pending Requests')}
        {requests.length > 0 && (
          <span className="ml-auto px-2 py-0.5 text-xs bg-amber-100 text-amber-600 rounded-full">{requests.length}</span>
        )}
      </h3>
      {requests.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{getText('Aucune demande en attente', 'No pending requests')}</p>
      ) : (
        <div className="space-y-2">
          {requests.map((req: any, i: number) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{req.name}</p>
                <p className="text-xs text-gray-500">{req.type} - {req.days} {getText('jours', 'days')}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Recent Activity Widget
function RecentActivityWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const { data, loading } = useWorkspaceData();

  const activities = data?.recentActivities || [];

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Activity className="text-violet-500" />
        {getText('Activité récente', 'Recent Activity')}
      </h3>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{getText('Aucune activité récente', 'No recent activity')}</p>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 5).map((act: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{act.user?.charAt(0) || 'S'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{act.action}</p>
                <p className="text-xs text-gray-500">{act.user}</p>
              </div>
              <span className="text-xs text-gray-400">{act.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Team Overview Widget
function TeamOverviewWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const { data, loading } = useWorkspaceData();

  const team = data?.teamMembers || [];

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Users className="text-violet-500" />
        {getText('Mon équipe', 'My Team')}
      </h3>
      {team.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{getText('Aucun membre', 'No members')}</p>
      ) : (
        <div className="space-y-2">
          {team.slice(0, 5).map((member: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {member.name?.charAt(0) || 'U'}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                  member.status === 'present' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                <p className="text-xs text-gray-500">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Calendar Widget
function CalendarWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const today = new Date()

  const events = [
    { title: getText('Réunion équipe', 'Team Meeting'), time: '10:00', color: 'bg-blue-500' },
    { title: getText('Review projet', 'Project Review'), time: '14:00', color: 'bg-purple-500' },
    { title: getText('Formation', 'Training'), time: '16:00', color: 'bg-green-500' },
  ]

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Calendar className="text-violet-500" />
        {getText("Aujourd'hui", 'Today')} - {today.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>
      <div className="space-y-2">
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className={`w-1 h-10 rounded-full ${event.color}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
              <p className="text-xs text-gray-500">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Notifications Widget
function NotificationsWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr

  const notifications = [
    { title: getText('Nouvelle demande de congé', 'New leave request'), time: '5 min', read: false },
    { title: getText('Document signé', 'Document signed'), time: '1h', read: false },
    { title: getText('Rappel réunion', 'Meeting reminder'), time: '2h', read: true },
  ]

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Bell className="text-violet-500" />
        {getText('Notifications', 'Notifications')}
        <span className="ml-auto px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">2</span>
      </h3>
      <div className="space-y-2">
        {notifications.map((notif, i) => (
          <div key={i} className={`p-3 rounded-xl transition-colors ${
            notif.read 
              ? 'bg-gray-50 dark:bg-gray-700/30' 
              : 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-500'
          }`}>
            <p className="text-sm text-gray-900 dark:text-white">{notif.title}</p>
            <p className="text-xs text-gray-500 mt-1">{getText('Il y a', '')} {notif.time} {language === 'en' ? 'ago' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Documents Widget
function DocumentsWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr

  const documents = [
    { name: 'Contrat.pdf', type: 'PDF', size: '2.3 MB' },
    { name: 'Attestation.pdf', type: 'PDF', size: '1.1 MB' },
    { name: 'Fiche_paie.pdf', type: 'PDF', size: '0.8 MB' },
  ]

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <FileText className="text-violet-500" />
        {getText('Documents récents', 'Recent Documents')}
      </h3>
      <div className="space-y-2">
        {documents.map((doc, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <FileText className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
              <p className="text-xs text-gray-500">{doc.size}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Performance Widget
function PerformanceWidget() {
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const { data, loading } = useWorkspaceData();

  const performanceData = data?.performanceStats || { daysPresent: 0, avgEntryTime: '--:--', avgExitTime: '--:--' };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="text-violet-500" />
        {getText('Performance du mois', 'Monthly Performance')}
      </h3>
      <div className="space-y-4">
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">{getText('Jours présents', 'Days Present')}</p>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{performanceData.daysPresent}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400">{getText('Moy. entrée', 'Avg. Entry')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{performanceData.avgEntryTime}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400">{getText('Moy. sortie', 'Avg. Exit')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{performanceData.avgExitTime}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============= Main Workspace Page Content =============

function WorkspacePageContent() {
  const { language } = useLanguage()

  const getText = (fr: string, en: string) => language === 'en' ? en : fr

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <LayoutGrid className="text-white" />
              </div>
              {getText('Espace de travail', 'Workspace')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {getText('Organisez vos panneaux pour un multitâche efficace', 'Organize your panels for efficient multitasking')}
            </p>
          </div>
          
          {/* Layout Selector */}
          <LayoutSelector />
        </div>
      </div>

      {/* Split Screen Container */}
      <SplitScreenContainer />
    </div>
  )
}

// ============= Main Export with Provider =============

export default function WorkspacePage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const getText = (fr: string, en: string) => language === 'en' ? en : fr

  const availablePanels = useMemo(() => {
    const panels = [
      { id: 'stats', title: getText('Statistiques', 'Statistics'), component: <QuickStatsWidget /> },
      { id: 'activity', title: getText('Activité', 'Activity'), component: <RecentActivityWidget /> },
      { id: 'calendar', title: getText('Calendrier', 'Calendar'), component: <CalendarWidget /> },
      { id: 'notifications', title: getText('Notifications', 'Notifications'), component: <NotificationsWidget /> },
      { id: 'documents', title: getText('Documents', 'Documents'), component: <DocumentsWidget /> },
      { id: 'performance', title: getText('Performance', 'Performance'), component: <PerformanceWidget /> },
    ]

    // Add role-specific panels
    if (session?.user?.role === 'RH' || session?.user?.role === 'SUPER_ADMIN') {
      panels.push(
        { id: 'requests', title: getText('Demandes', 'Requests'), component: <PendingRequestsWidget /> },
        { id: 'team', title: getText('Équipe', 'Team'), component: <TeamOverviewWidget /> },
      )
    }

    return panels
  }, [session?.user?.role, language, getText])

  return (
    <SplitScreenProvider availablePanels={availablePanels} defaultLayout="split-2h">
      <WorkspacePageContent />
    </SplitScreenProvider>
  )
}
