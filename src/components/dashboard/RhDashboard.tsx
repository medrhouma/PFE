import { getPool } from '@/lib/mysql-direct';

const query = async (sql: string, params?: any[]) => {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params || []);
  return rows;
};
import StatsCard from './cards/StatsCard';
import PendingEmployeesList from '@/components/employees/PendingEmployeesList';
import { FiUsers, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default async function RhDashboard() {
  // Fetch real data from MySQL
  let pendingEmployees = 0;
  let approvedEmployees = 0;
  let rejectedEmployees = 0;
  let totalEmployees = 0;

  try {
    // Check if tables exist first
    let tablesExist = true;
    
    try {
      // Test if User table exists (actual table name in DB)
      await query('SELECT 1 FROM User LIMIT 1');
      
      // Test if Employe table exists
      await query('SELECT 1 FROM Employe LIMIT 1');
    } catch (tableError) {
      console.warn('Database tables may not exist yet:', tableError);
      tablesExist = false;
    }
    
    if (tablesExist) {
      // Get total users
      const totalUsersResult: any = await query('SELECT COUNT(*) as count FROM User');
      totalEmployees = Array.isArray(totalUsersResult) && totalUsersResult[0]?.count ? parseInt(totalUsersResult[0].count) : 0;
      
      // Get pending employee profiles
      try {
        const pendingResult: any = await query(
          `SELECT COUNT(*) as count FROM Employe WHERE statut = 'EN_ATTENTE'`
        );
        pendingEmployees = Array.isArray(pendingResult) && pendingResult[0]?.count ? parseInt(pendingResult[0].count) : 0;
      } catch (error) {
        console.error('Error fetching pending employees:', error);
        pendingEmployees = 0;
      }
      
      // Get approved employee profiles
      try {
        const approvedResult: any = await query(
          `SELECT COUNT(*) as count FROM Employe WHERE statut = 'APPROUVE'`
        );
        approvedEmployees = Array.isArray(approvedResult) && approvedResult[0]?.count ? parseInt(approvedResult[0].count) : 0;
      } catch (error) {
        console.error('Error fetching approved employees:', error);
        approvedEmployees = 0;
      }
      
      // Get rejected employee profiles
      try {
        const rejectedResult: any = await query(
          `SELECT COUNT(*) as count FROM Employe WHERE statut = 'REJETE'`
        );
        rejectedEmployees = Array.isArray(rejectedResult) && rejectedResult[0]?.count ? parseInt(rejectedResult[0].count) : 0;
      } catch (error) {
        console.error('Error fetching rejected employees:', error);
        rejectedEmployees = 0;
      }
    } else {
      // Fallback to default values if tables don't exist
      pendingEmployees = 0;
      approvedEmployees = 0;
      rejectedEmployees = 0;
      totalEmployees = 0;
    }
  } catch (error) {
    console.error('Error fetching HR data:', error);
    // Fallback to default values
    pendingEmployees = 0;
    approvedEmployees = 0;
    rejectedEmployees = 0;
    totalEmployees = 0;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard RH</h1>
            <p className="text-blue-100">Gestion des ressources humaines et validation des profils</p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <FiUsers className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Employés</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalEmployees}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center">
                <span className="mr-1">●</span> Tous statuts
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiUsers className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En Attente</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{pendingEmployees}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center">
                <span className="mr-1">⏱</span> Requiert attention
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiClock className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approuvés</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{approvedEmployees}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center">
                <span className="mr-1">✓</span> Validés
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiCheckCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejetés</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{rejectedEmployees}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center">
                <span className="mr-1">✕</span> À revoir
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiXCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Required Alert */}
      {pendingEmployees > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-l-4 border-orange-500 rounded-xl p-6 shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiClock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {pendingEmployees} profil{pendingEmployees > 1 ? 's' : ''} en attente de validation
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Des employés attendent votre validation pour accéder à la plateforme
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Employees List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <FiClock className="w-5 h-5 mr-2 text-orange-600" />
            Profils en Attente de Validation
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Examinez et validez les nouveaux profils employés
          </p>
        </div>
        <div className="p-6">
          <PendingEmployeesList />
        </div>
      </div>
    </div>
  );
}
