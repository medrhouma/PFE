import { query } from '@/lib/mysql-direct';
import StatsCard from './cards/StatsCard';
import PendingEmployeesList from '@/components/employees/PendingEmployeesList';

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard RH</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Employés" value={totalEmployees.toString()} />
        <StatsCard title="Profils en attente" value={pendingEmployees.toString()} />
        <StatsCard title="Profils approuvés" value={approvedEmployees.toString()} />
        <StatsCard title="Profils rejetés" value={rejectedEmployees.toString()} />
      </div>

      {/* Pending Employees List */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Profils en attente de validation</h2>
        <PendingEmployeesList />
      </div>
    </div>
  );
}
