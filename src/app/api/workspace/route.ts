import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { sanitizeImageFromAPI } from "@/lib/utils";

/**
 * GET /api/workspace
 * Get real-time workspace data for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Get attendance stats for today
    let attendanceStats = {
      present: 0,
      absent: 0,
      onLeave: 0,
      late: 0
    };

    try {
      // Count users who checked in today
      const checkins = await query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM attendance_sessions
        WHERE date = ? AND check_in_time IS NOT NULL
      `, [todayStr]) as any[];
      attendanceStats.present = checkins[0]?.count || 0;

      // Count users on leave
      const leaves = await query(`
        SELECT COUNT(DISTINCT userId) as count
        FROM demande_conge
        WHERE status = 'APPROUVE' 
        AND ? BETWEEN date_debut AND date_fin
      `, [todayStr]) as any[];
      attendanceStats.onLeave = leaves[0]?.count || 0;

      // Get total active employees
      const totalEmployees = await query(`
        SELECT COUNT(*) as count FROM User WHERE status = 'ACTIVE'
      `, []) as any[];
      const total = totalEmployees[0]?.count || 0;
      attendanceStats.absent = Math.max(0, total - attendanceStats.present - attendanceStats.onLeave);

      // Count late arrivals (after 9:00 AM)
      const lateArrivals = await query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM attendance_sessions
        WHERE date = ? 
        AND session_type = 'MORNING'
        AND check_in_time IS NOT NULL
        AND TIME(check_in_time) > '09:00:00'
      `, [todayStr]) as any[];
      attendanceStats.late = lateArrivals[0]?.count || 0;
    } catch (e) {
      console.error("Error fetching attendance stats:", e);
    }

    // Get pending leave requests
    let pendingRequests: any[] = [];
    try {
      const requests = await query(`
        SELECT 
          dc.id, dc.type, dc.date_debut, dc.date_fin, dc.status,
          u.name, u.email,
          e.nom, e.prenom
        FROM demande_conge dc
        JOIN User u ON dc.userId COLLATE utf8mb4_unicode_ci = u.id
        LEFT JOIN Employe e ON u.id COLLATE utf8mb4_unicode_ci = e.user_id
        WHERE dc.status = 'EN_ATTENTE'
        ORDER BY dc.id DESC
        LIMIT 5
      `, []) as any[];

      pendingRequests = requests.map(r => ({
        id: r.id,
        name: r.prenom && r.nom ? `${r.prenom} ${r.nom}` : r.name,
        type: r.type,
        startDate: r.date_debut,
        endDate: r.date_fin,
        days: Math.ceil((new Date(r.date_fin).getTime() - new Date(r.date_debut).getTime()) / (1000 * 60 * 60 * 24)) + 1
      }));
    } catch (e) {
      console.error("Error fetching pending requests:", e);
    }

    // Get recent activities (from AuditLog)
    let recentActivities: any[] = [];
    try {
      const activities = await query(`
        SELECT 
          al.id, al.action, al.entity_type as entityType, al.created_at as createdAt,
          u.name,
          e.prenom
        FROM audit_logs al
        LEFT JOIN User u ON al.user_id COLLATE utf8mb4_unicode_ci = u.id
        LEFT JOIN Employe e ON u.id COLLATE utf8mb4_unicode_ci = e.user_id
        ORDER BY al.created_at DESC
        LIMIT 10
      `, []) as any[];

      recentActivities = activities.map(a => ({
        id: a.id,
        action: formatAction(a.action),
        user: a.prenom || a.name || 'Système',
        time: new Date(a.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        entityType: a.entityType
      }));
    } catch (e) {
      console.error("Error fetching recent activities:", e);
    }

    // Get team members (for RH/Admin)
    let teamMembers: any[] = [];
    try {
      const members = await query(`
        SELECT 
          u.id, u.name, u.email, u.role, u.status,
          e.nom, e.prenom, e.photo,
          (SELECT COUNT(*) FROM attendance_sessions a WHERE a.user_id COLLATE utf8mb4_unicode_ci = u.id AND a.date = ? AND a.check_in_time IS NOT NULL) as checkedIn
        FROM User u
        LEFT JOIN Employe e ON u.id COLLATE utf8mb4_unicode_ci = e.user_id
        WHERE u.status = 'ACTIVE'
        ORDER BY u.name
        LIMIT 10
      `, [todayStr]) as any[];

      teamMembers = members.map(m => ({
        id: m.id,
        name: m.prenom && m.nom ? `${m.prenom} ${m.nom.charAt(0)}.` : m.name,
        role: m.role,
        status: m.checkedIn > 0 ? 'present' : 'absent',
        photo: sanitizeImageFromAPI(m.photo)
      }));
    } catch (e) {
      console.error("Error fetching team members:", e);
    }

    // Get performance stats
    let performanceStats = {
      daysPresent: 0,
      avgEntryTime: '--:--',
      avgExitTime: '--:--'
    };

    try {
      // Current month stats for the logged-in user
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      
      const userStats = await query(`
        SELECT 
          COUNT(DISTINCT date) as days,
          AVG(CASE WHEN session_type = 'MORNING' AND check_in_time IS NOT NULL THEN TIME_TO_SEC(TIME(check_in_time)) END) as avgEntry,
          AVG(CASE WHEN session_type = 'AFTERNOON' AND check_out_time IS NOT NULL THEN TIME_TO_SEC(TIME(check_out_time)) END) as avgExit
        FROM attendance_sessions
        WHERE user_id = ? AND date >= ?
      `, [session.user.id, firstDayOfMonth]) as any[];

      if (userStats[0]) {
        performanceStats.daysPresent = userStats[0].days || 0;
        if (userStats[0].avgEntry) {
          const avgEntry = Math.floor(userStats[0].avgEntry);
          performanceStats.avgEntryTime = `${String(Math.floor(avgEntry / 3600)).padStart(2, '0')}:${String(Math.floor((avgEntry % 3600) / 60)).padStart(2, '0')}`;
        }
        if (userStats[0].avgExit) {
          const avgExit = Math.floor(userStats[0].avgExit);
          performanceStats.avgExitTime = `${String(Math.floor(avgExit / 3600)).padStart(2, '0')}:${String(Math.floor((avgExit % 3600) / 60)).padStart(2, '0')}`;
        }
      }
    } catch (e) {
      console.error("Error fetching performance stats:", e);
    }

    return NextResponse.json({
      attendanceStats,
      pendingRequests,
      recentActivities,
      teamMembers,
      performanceStats,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching workspace data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    'LOGIN': 'Connexion',
    'LOGOUT': 'Déconnexion',
    'POINTAGE_ENTREE': 'Pointage entrée',
    'POINTAGE_SORTIE': 'Pointage sortie',
    'CREATE': 'Création',
    'UPDATE': 'Modification',
    'DELETE': 'Suppression',
    'LEAVE_REQUEST': 'Demande de congé',
    'LEAVE_APPROVED': 'Congé approuvé',
    'LEAVE_REJECTED': 'Congé refusé',
    'PROFILE_UPDATE': 'Profil mis à jour',
    'DOCUMENT_UPLOAD': 'Document ajouté'
  };
  return actionMap[action] || action;
}
