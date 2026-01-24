import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';
import EmployeeProfileForm from '@/components/employees/EmployeeProfileForm';

export default async function UserDashboard() {
  const session = await getServerSession(authOptions);
  
  // Check if user has already submitted their profile
  let employeeProfile: any = null;
  
  try {
    const result: any = await query(
      'SELECT * FROM Employe WHERE user_id = ?',
      [session?.user?.id || '']
    );
    
    if (result && result.length > 0) {
      employeeProfile = result[0];
    }
  } catch (error) {
    console.error('Error checking employee profile:', error);
  }
  
  // If profile exists and is pending, show waiting message
  if (employeeProfile && employeeProfile.statut === 'EN_ATTENTE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Profil en attente de vérification
            </h2>
            <p className="text-gray-600 mb-6">
              Votre profil a été soumis avec succès et est en attente de validation par le service RH.
            </p>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
              <p className="text-sm text-violet-700">
                Vous serez notifié par email une fois votre profil vérifié et approuvé.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If profile is rejected, allow resubmission
  if (employeeProfile && employeeProfile.statut === 'REJETE') {
    return (
      <div className="p-6">
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Profil refusé</h3>
          <p className="text-red-600 text-sm">
            Votre profil a été refusé. Veuillez corriger les informations et soumettre à nouveau.
          </p>
        </div>
        <EmployeeProfileForm />
      </div>
    );
  }
  
  // If profile approved, show regular dashboard (future feature)
  if (employeeProfile && employeeProfile.statut === 'APPROUVE') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>
        <p className="text-gray-600">Votre profil a été approuvé. Bienvenue !</p>
      </div>
    );
  }

  // If no profile, show the form
  let userName = 'Utilisateur';
  let userEmail = session?.user?.email || 'N/A';

  try {
    // Check if tables exist first
    let tablesExist = true;
    
    try {
      // Test if User table exists (actual table name in DB)
      await query('SELECT 1 FROM User LIMIT 1');
    } catch (tableError) {
      console.warn('Database tables may not exist yet:', tableError);
      tablesExist = false;
    }
    
    if (tablesExist) {
      // Get user's information
      let userResult: any = [];
      try {
        userResult = await query(
          'SELECT id, name, email FROM User WHERE email = ?',
          [session?.user?.email || '']
        );
      } catch (userError) {
        console.error('Error fetching user:', userError);
      }
      
      if (Array.isArray(userResult) && userResult.length > 0) {
        const user = userResult[0];
        userName = user.name || session?.user?.name || 'Utilisateur';
        userEmail = user.email || session?.user?.email || 'N/A';
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Complétez votre profil</h1>

      <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
        <p className="text-gray-700"><span className="font-semibold">Email:</span> {userEmail}</p>
        <p className="text-gray-700"><span className="font-semibold">Nom:</span> {userName}</p>
      </div>

      {/* Employee Profile Form */}
      <EmployeeProfileForm />
    </div>
  );
}
