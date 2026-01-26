'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  FiAward, 
  FiClock, 
  FiTarget, 
  FiActivity,
  FiCalendar,
  FiFileText,
  FiSettings,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiTrendingUp
} from 'react-icons/fi';

interface LeaveStats {
  approvedLeaves: number;
  pendingLeaves: number;
  totalDays: number;
  performance: number;
}

export default function UserDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<LeaveStats>({
    approvedLeaves: 0,
    pendingLeaves: 0,
    totalDays: 0,
    performance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/conges');
        if (response.ok) {
          const data = await response.json();
          const leaves = Array.isArray(data) ? data : [];
          
          const approved = leaves.filter((l: any) => l.status === 'VALIDE').length;
          const pending = leaves.filter((l: any) => l.status === 'EN_ATTENTE').length;
          const totalDaysUsed = leaves
            .filter((l: any) => l.status === 'VALIDE')
            .reduce((sum: number, l: any) => {
              const start = new Date(l.date_debut);
              const end = new Date(l.date_fin);
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return sum + days;
            }, 0);
          
          const performance = Math.min(100, Math.round((approved / Math.max(1, approved + pending)) * 100));
          
          setStats({
            approvedLeaves: approved,
            pendingLeaves: pending,
            totalDays: totalDaysUsed,
            performance
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchStats();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'Utilisateur';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 dark:from-purple-900 dark:via-indigo-900 dark:to-purple-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/30 rounded-full filter blur-3xl animate-pulse delay-700"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm text-white/90 font-medium">Profil Actif</span>
              </div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Bienvenue, {firstName}
              </h1>
              <p className="text-xl text-purple-100">
                Gérez vos congés, consultez vos documents et suivez vos performances.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
                <FiUser className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8 mb-8">
          {/* Approved Leaves Card */}
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiAward className="w-6 h-6 text-white" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  <FiTrendingUp className="w-3 h-3" />
                  Validé
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Congés Approuvés</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.approvedLeaves}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Demandes acceptées</p>
            </div>
          </div>

          {/* Pending Leaves Card */}
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiClock className="w-6 h-6 text-white" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                  <FiClock className="w-3 h-3" />
                  En cours
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Congés En Attente</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingLeaves}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">En cours de validation</p>
            </div>
          </div>

          {/* Total Days Card */}
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiTarget className="w-6 h-6 text-white" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                  <FiCalendar className="w-3 h-3" />
                  Total
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Jours</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Jours de congé utilisés</p>
            </div>
          </div>

          {/* Performance Card */}
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiActivity className="w-6 h-6 text-white" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded-full">
                  <FiTrendingUp className="w-3 h-3" />
                  {stats.performance}%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Performance</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.performance}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Taux d'approbation</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Leave Request Card */}
            <a href="/conges" className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FiCalendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Demander un Congé</h3>
                <p className="text-sm text-purple-100">Soumettre une nouvelle demande de congé</p>
              </div>
            </a>

            {/* Pointage Card */}
            <a href="/pointage" className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FiClock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Pointage</h3>
                <p className="text-sm text-emerald-100">Gérer vos heures de travail</p>
              </div>
            </a>

            {/* Documents Card */}
            <a href="/documents" className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FiFileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Mes Documents</h3>
                <p className="text-sm text-amber-100">Accéder à vos documents</p>
              </div>
            </a>

            {/* Profile Card */}
            <a href="/profile" className="group relative overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FiSettings className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Mon Profil</h3>
                <p className="text-sm text-cyan-100">Modifier vos informations</p>
              </div>
            </a>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Informations Personnelles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiUser className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom Complet</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">{session?.user?.name || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiMail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">{session?.user?.email || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiPhone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Téléphone</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">Non renseigné</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiMapPin className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Localisation</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">Non renseigné</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}