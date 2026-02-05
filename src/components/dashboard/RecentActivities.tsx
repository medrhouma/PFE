'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle, XCircle, User, LogIn, LogOut, 
  FileText, Calendar, AlertTriangle, Shield, Activity,
  ChevronRight, RefreshCw
} from 'lucide-react';

interface RecentActivity {
  id: string;
  type: 'login' | 'profile' | 'pointage' | 'contract' | 'leave' | 'system' | 'otp';
  action: string;
  userName: string;
  userEmail?: string;
  ipAddress?: string;
  timestamp: string;
  status: string;
  details?: string;
  metadata?: any;
}

const typeFilters = [
  { value: 'all', label: 'Tous', icon: Activity },
  { value: 'login', label: 'Connexions', icon: LogIn },
  { value: 'profile', label: 'Profils', icon: User },
  { value: 'pointage', label: 'Pointages', icon: Clock },
  { value: 'contract', label: 'Contrats', icon: FileText },
  { value: 'leave', label: 'Congés', icon: Calendar },
];

export default function RecentActivities() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadActivities();
  }, [filter]);

  const loadActivities = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/employees/recent-activities?limit=20&type=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTypeIcon = (type: string, status: string) => {
    const isError = status === 'ERROR' || status === 'CRITICAL';
    const isWarning = status === 'WARNING';
    
    const iconClass = `w-5 h-5 ${
      isError ? 'text-red-500' : 
      isWarning ? 'text-amber-500' : 
      status === 'SUCCESS' ? 'text-green-500' : 
      'text-violet-500'
    }`;

    switch (type) {
      case 'login':
        return <LogIn className={iconClass} />;
      case 'profile':
        return <User className={iconClass} />;
      case 'pointage':
        return isWarning ? <AlertTriangle className={iconClass} /> : <Clock className={iconClass} />;
      case 'contract':
        return <FileText className={iconClass} />;
      case 'leave':
        return <Calendar className={iconClass} />;
      case 'system':
        return <Shield className={iconClass} />;
      case 'otp':
        return <Shield className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'LOGIN_SUCCESS': 'Connexion réussie',
      'LOGIN_FAILED': 'Échec de connexion',
      'PROFILE_SUBMITTED': 'Profil soumis',
      'PROFILE_APPROVED': 'Profil approuvé',
      'PROFILE_REJECTED': 'Profil rejeté',
      'POINTAGE_IN': 'Entrée',
      'POINTAGE_OUT': 'Sortie',
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'RH_ACTION_REQUIRED': 'Action RH requise',
      'SYSTEM_ALERT': 'Alerte système',
    };
    return labels[action] || action.replace(/_/g, ' ').toLowerCase();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'SUCCESS': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Succès' },
      'ERROR': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Erreur' },
      'WARNING': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Attention' },
      'PENDING': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'En attente' },
      'INFO': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: 'Info' },
      'NORMAL': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: 'Normal' },
      'HIGH': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Urgent' },
      'URGENT': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Critique' },
      'CRITICAL': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Critique' },
      'EN_ATTENTE': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'En attente' },
      'APPROUVE': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Approuvé' },
      'REJETE': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejeté' },
    };
    const badge = badges[status] || badges['INFO'];
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
        {/* Activity skeletons */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Refresh */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          {typeFilters.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === value
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadActivities(true)}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune activité récente</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Les activités apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 hover:from-violet-50/50 hover:to-purple-50/50 dark:hover:from-violet-900/10 dark:hover:to-purple-900/10 transition-all border border-gray-100 dark:border-gray-700 group"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                activity.status === 'ERROR' || activity.status === 'CRITICAL' || activity.status === 'REJETE' ? 'bg-red-100 dark:bg-red-900/30' :
                activity.status === 'WARNING' || activity.status === 'EN_ATTENTE' ? 'bg-amber-100 dark:bg-amber-900/30' :
                activity.status === 'SUCCESS' || activity.status === 'APPROUVE' ? 'bg-green-100 dark:bg-green-900/30' :
                'bg-violet-100 dark:bg-violet-900/30'
              }`}>
                {getTypeIcon(activity.type, activity.status)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-semibold">{activity.userName}</span>
                      <span className="text-gray-600 dark:text-gray-400 mx-1">•</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {getActionLabel(activity.action)}
                      </span>
                    </p>
                    
                    {/* Details */}
                    {activity.details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {activity.details}
                      </p>
                    )}
                    
                    {/* Metadata row */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatTimestamp(activity.timestamp)}</span>
                      {activity.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{activity.ipAddress}</span>
                        </>
                      )}
                      {activity.metadata?.browser && (
                        <>
                          <span>•</span>
                          <span>{activity.metadata.browser}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {activities.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href="/parametres/logs"
            className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium group"
          >
            Voir tous les logs
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      )}
    </div>
  );
}

