import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

// Helper function to safely query tables that might not exist or have schema issues
async function safeQuery<T>(sql: string, params?: any[]): Promise<T | null> {
  try {
    return await query(sql, params) as T;
  } catch (error: any) {
    // Handle missing tables or columns gracefully
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      console.log(`Query error (${error.code}): ${error.sqlMessage || error.message}`);
      return null;
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Get stats using mysql-direct with safe queries
    const totalUsersResult = await safeQuery<any[]>('SELECT COUNT(*) as count FROM User');
    const totalUsers = totalUsersResult?.[0]?.count || 0;
    
    const pendingProfilesResult = await safeQuery<any[]>('SELECT COUNT(*) as count FROM Employe WHERE status = "EN_ATTENTE"');
    const pendingProfiles = pendingProfilesResult?.[0]?.count || 0;
    
    const pendingCongesResult = await safeQuery<any[]>('SELECT COUNT(*) as count FROM demande_conge WHERE status = "EN_ATTENTE"');
    const pendingConges = pendingCongesResult?.[0]?.count || 0;
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Try to get pointages count (table might not exist yet)
    const todayPointagesResult = await safeQuery<any[]>(
      'SELECT COUNT(*) as count FROM Pointage WHERE timestamp >= ? AND timestamp < ?',
      [today, tomorrow]
    );
    const todayPointages = todayPointagesResult?.[0]?.count || 0;

    // Get recent activities
    const activities: any[] = [];

    // Recent pointages (if table exists) - use u.* to get all user columns
    const recentPointages = await safeQuery<any[]>(`
      SELECT p.*, u.name as userName, u.email as userEmail
      FROM Pointage p
      LEFT JOIN User u ON p.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      ORDER BY p.timestamp DESC
      LIMIT 20
    `) || [];

    for (const p of recentPointages) {
      activities.push({
        id: p.id,
        userId: p.user_id,
        userName: p.userName || p.userEmail || 'Utilisateur',
        userEmail: p.userEmail,
        type: 'POINTAGE',
        action: p.type === 'IN' ? 'Check-in' : 'Check-out',
        timestamp: p.timestamp,
        details: {
          location: p.geolocation,
          device: p.device_fingerprint_id,
          anomaly: p.anomaly_detected
        }
      });
    }

    // Recent congé requests (if table exists)
    const recentConges = await safeQuery<any[]>(`
      SELECT dc.*, u.name as userName, u.email as userEmail
      FROM demande_conge dc
      LEFT JOIN User u ON dc.user_id = u.id
      ORDER BY dc.date_debut DESC
      LIMIT 15
    `) || [];

    for (const c of recentConges) {
      activities.push({
        id: c.id,
        userId: c.user_id,
        userName: c.userName || c.userEmail || 'Utilisateur',
        userEmail: c.userEmail,
        type: 'CONGE',
        action: 'Demande de congé',
        timestamp: c.date_debut,
        details: {
          type: c.type,
          startDate: c.date_debut,
          endDate: c.date_fin,
          status: c.status
        }
      });
    }

    // Recent profile submissions (if table exists)
    const pendingEmployees = await safeQuery<any[]>(`
      SELECT e.*, u.name as userName, u.email as userEmail
      FROM Employe e
      LEFT JOIN User u ON e.user_id = u.id
      WHERE e.status = 'EN_ATTENTE'
      ORDER BY e.created_at DESC
      LIMIT 10
    `) || [];

    for (const prof of pendingEmployees) {
      activities.push({
        id: prof.id,
        userId: prof.user_id,
        userName: prof.userName || prof.nom || prof.userEmail || 'Utilisateur',
        userEmail: prof.userEmail,
        type: 'PROFILE',
        action: 'Profil soumis',
        timestamp: prof.created_at || new Date(),
        details: {
          status: prof.status,
          position: prof.poste,
          department: prof.departement
        }
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Get employees list for RH (if table exists)
    const employees = await safeQuery<any[]>(`
      SELECT 
        e.*,
        u.id as u_id,
        u.name as u_name,
        u.email as u_email,
        u.image as u_image,
        u.telephone as u_telephone,
        u.status as u_status,
        u.created_at as u_created_at
      FROM Employe e
      LEFT JOIN User u ON e.user_id = u.id
      ORDER BY e.created_at DESC
    `) || [];

    // Format employees for frontend
    const formattedEmployees = employees.map(emp => ({
      id: emp.id,
      odooEmployeeId: emp.user_id,
      email: emp.email || emp.u_email,
      cin: emp.cin,
      nom: emp.nom || emp.u_name,
      prenom: emp.prenom,
      dateNaissance: emp.date_naissance,
      sexe: emp.sexe,
      adresse: emp.adresse,
      telephone: emp.telephone || emp.u_telephone,
      dateEmbauche: emp.date_embauche,
      typeContrat: emp.type_contrat,
      departement: emp.departement,
      poste: emp.poste,
      photo: emp.photo,
      cv: emp.cv,
      rib: emp.rib,
      statut: emp.status,
      rejectionReason: emp.rejection_reason,
      user: emp.u_id ? {
        id: emp.u_id,
        name: emp.u_name,
        email: emp.u_email,
        image: emp.u_image,
        telephone: emp.u_telephone,
        status: emp.u_status,
        createdAt: emp.u_created_at
      } : null
    }));

    return NextResponse.json({
      stats: {
        totalEmployees: totalUsers,
        pendingProfiles: pendingProfiles,
        pendingConges: pendingConges,
        todayPointages: todayPointages
      },
      activities: activities.slice(0, 30),
      employees: formattedEmployees
    });
  } catch (error: any) {
    console.error("Error fetching RH dashboard data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données", details: error.message },
      { status: 500 }
    );
  }
}
