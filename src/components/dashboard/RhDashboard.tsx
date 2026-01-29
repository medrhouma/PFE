'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, Clock, CheckCircle, XCircle, Calendar,
  Activity, Bell, LogIn, LogOut, AlertCircle 
} from 'lucide-react';

interface RecentActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'POINTAGE' | 'CONGE' | 'PROFILE';
  action: string;
  timestamp: string;
  details?: any;
}

interface Stats {
  totalEmployees: number;
  pendingProfiles: number;
  pendingConges: number;
  todayPointages: number;
}

export default function RhDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    pendingProfiles: 0,
    pendingConges: 0,
    todayPointages: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/rh/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'POINTAGE':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'CONGE':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      case 'PROFILE':
        return <Users className="w-5 h-5 text-green-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'POINTAGE':
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
      case 'CONGE':
        return 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800';
      case 'PROFILE':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Dashboard RH</h1>
        <p className="text-blue-100">Vue d'ensemble des activités et tâches en temps réel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Employés</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalEmployees}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Profils en attente</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingProfiles}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Congés en attente</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.pendingConges}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pointages aujourd'hui</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.todayPointages}</p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Activités en Temps Réel
          </h2>
          <button
            onClick={fetchDashboardData}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Activity className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune activité récente</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-l-4 ${
                  activity.type === 'POINTAGE' ? 'border-l-blue-500' :
                  activity.type === 'CONGE' ? 'border-l-purple-500' :
                  'border-l-green-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {activity.userName}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {activity.action}
                    </p>
                    
                    {activity.details && (
                      <div className="flex flex-wrap gap-2">
                        {activity.type === 'POINTAGE' && (
                          <>
                            {activity.details.anomaly && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded">
                                <AlertCircle className="w-3 h-3" />
                                Anomalie
                              </span>
                            )}
                            {activity.details.location && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                GPS
                              </span>
                            )}
                          </>
                        )}
                        
                        {activity.type === 'CONGE' && (
                          <>
                            <span className={`px-2 py-1 text-xs rounded ${
                              activity.details.status === 'EN_ATTENTE' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
                              activity.details.status === 'VALIDE' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                              'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            }`}>
                              {activity.details.status}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                              {new Date(activity.details.startDate).toLocaleDateString('fr-FR')} - {new Date(activity.details.endDate).toLocaleDateString('fr-FR')}
                            </span>
                          </>
                        )}
                        
                        {activity.type === 'PROFILE' && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs rounded">
                            En attente de validation
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/rh/conges"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <Calendar className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Gestion des Congés
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Approuver ou rejeter les demandes
          </p>
          {stats.pendingConges > 0 && (
            <span className="inline-block mt-3 px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
              {stats.pendingConges} en attente
            </span>
          )}
        </a>

        <a
          href="/rh/profiles"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <Users className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Validation Profils
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Valider les nouveaux profils
          </p>
          {stats.pendingProfiles > 0 && (
            <span className="inline-block mt-3 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
              {stats.pendingProfiles} en attente
            </span>
          )}
        </a>

        <a
          href="/rh/notifications"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <Bell className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Centre de Notifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Voir toutes les notifications
          </p>
        </a>
      </div>
    </div>
  );
}

