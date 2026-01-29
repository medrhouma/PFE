import { getPool } from '@/lib/mysql-direct';

const query = async (sql: string, params?: any[]) => {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params || []);
  return rows;
};
import StatsCard from './cards/StatsCard';
import EmployeeList from '@/components/employees/EmployeeList';
import RecentActivities from './RecentActivities';
import { Users, UserCheck, Shield, Activity, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  userCount: number | null;
  employeeCount: number | null;
  rhActiveCount: number | null;
  pendingCount: number | null;
  hasError: boolean;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const stats: DashboardStats = {
    userCount: null,
    employeeCount: null,
    rhActiveCount: null,
    pendingCount: null,
    hasError: false
  };

  try {
    // Test if User table exists
    await query('SELECT 1 FROM User LIMIT 1');
    
    // Get total users
    const userResult: any = await query('SELECT COUNT(*) as count FROM User');
    stats.userCount = Array.isArray(userResult) && userResult[0]?.count ? parseInt(userResult[0].count) : 0;
    
    // Get employees with ACTIVE status
    const employeeResult: any = await query(
      "SELECT COUNT(*) as count FROM User WHERE status = 'ACTIVE'"
    );
    stats.employeeCount = Array.isArray(employeeResult) && employeeResult[0]?.count ? parseInt(employeeResult[0].count) : 0;
    
    // Get active RH users
    const rhResult: any = await query(
      "SELECT COUNT(*) as count FROM User WHERE role = 'RH' AND status = 'ACTIVE'"
    );
    stats.rhActiveCount = Array.isArray(rhResult) && rhResult[0]?.count ? parseInt(rhResult[0].count) : 0;

    // Get pending users (waiting for validation)
    const pendingResult: any = await query(
      "SELECT COUNT(*) as count FROM User WHERE status = 'PENDING'"
    );
    stats.pendingCount = Array.isArray(pendingResult) && pendingResult[0]?.count ? parseInt(pendingResult[0].count) : 0;
    
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    stats.hasError = true;
  }

  return stats;
}

export default async function AdminDashboard() {
  const stats = await fetchDashboardStats();

  // Helper to display stat or error state
  const renderStatValue = (value: number | null) => {
    if (value === null) {
      return <span className="text-gray-400">N/A</span>;
    }
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {stats.hasError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Erreur de connexion à la base de données
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Certaines statistiques peuvent être indisponibles. Veuillez rafraîchir la page.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Super Admin</h1>
            <p className="text-violet-100">Vue d&apos;ensemble complète de la plateforme</p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Utilisateurs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{renderStatValue(stats.userCount)}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center">
                <span className="mr-1">↗</span> Tous les rôles
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Employés Actifs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{renderStatValue(stats.employeeCount)}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center">
                <span className="mr-1">●</span> Profils validés
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">RH Actifs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{renderStatValue(stats.rhActiveCount)}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center">
                <span className="mr-1">●</span> En service
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En Attente</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{renderStatValue(stats.pendingCount)}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center">
                <span className="mr-1">⏳</span> Validation requise
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-violet-600" />
            Activités Récentes
          </h2>
        </div>
        <div className="p-6">
          <RecentActivities />
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-violet-600" />
            Liste des Employés
          </h2>
        </div>
        <div className="p-6">
          <EmployeeList />
        </div>
      </div>
    </div>
  );
}

