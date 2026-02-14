export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';

interface Activity {
  id: string;
  type: 'login' | 'profile' | 'pointage' | 'contract' | 'leave' | 'system' | 'otp';
  action: string;
  userName: string;
  userEmail?: string;
  ipAddress?: string;
  timestamp: Date;
  status: string;
  details?: string;
  metadata?: any;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Only SUPER_ADMIN and RH can view activities
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'RH') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const safeLimit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20));
    const type = searchParams.get('type'); // filter by type

    const activities: Activity[] = [];

    // 1. Fetch from audit_logs
    try {
      const auditLogs: any = await query(`
        SELECT 
          al.id,
          al.action,
          al.entity_type,
          al.entity_id,
          al.ip_address,
          al.user_agent,
          al.severity,
          al.created_at,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN User u ON al.user_id = u.id COLLATE utf8mb4_unicode_ci
        ORDER BY al.created_at DESC
        LIMIT ${safeLimit}
      `);

      auditLogs.forEach((log: any) => {
        let type: Activity['type'] = 'system';
        if (log.action?.includes('LOGIN') || log.action?.includes('LOGOUT')) type = 'login';
        else if (log.action?.includes('PROFILE') || log.entity_type === 'Employe') type = 'profile';
        else if (log.action?.includes('POINTAGE') || log.entity_type === 'Pointage') type = 'pointage';
        else if (log.action?.includes('CONTRACT') || log.entity_type === 'Contract') type = 'contract';
        else if (log.action?.includes('LEAVE') || log.entity_type === 'DemandeConge') type = 'leave';
        else if (log.action?.includes('OTP')) type = 'otp';

        activities.push({
          id: `audit_${log.id}`,
          type,
          action: log.action,
          userName: log.user_name || 'Système',
          userEmail: log.user_email,
          ipAddress: log.ip_address,
          timestamp: log.created_at,
          status: log.severity || 'INFO',
          details: `${log.entity_type || ''} ${log.entity_id || ''}`.trim(),
        });
      });
    } catch (e) {
      console.log('audit_logs table not found or error:', e);
    }

    // 2. Fetch from login_history
    try {
      const loginHistory: any = await query(`
        SELECT 
          lh.id,
          lh.created_at,
          lh.ip_address,
          lh.user_agent,
          lh.device_fingerprint,
          lh.is_suspicious,
          lh.login_method,
          lh.success,
          lh.failure_reason,
          u.name as user_name,
          u.email as user_email
        FROM login_history lh
        LEFT JOIN User u ON lh.user_id = u.id COLLATE utf8mb4_unicode_ci
        ORDER BY lh.created_at DESC
        LIMIT ${safeLimit}
      `);

      loginHistory.forEach((login: any) => {
        activities.push({
          id: `login_${login.id}`,
          type: 'login',
          action: login.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
          userName: login.user_name || 'Inconnu',
          userEmail: login.user_email,
          ipAddress: login.ip_address,
          timestamp: login.created_at,
          status: login.is_suspicious ? 'WARNING' : (login.success ? 'SUCCESS' : 'ERROR'),
          details: login.failure_reason || (login.user_agent ? login.user_agent.substring(0, 80) : ''),
          metadata: {
            userAgent: login.user_agent,
            method: login.login_method,
          }
        });
      });
    } catch (e) {
      console.log('login_history table not found or error:', e);
    }

    // 3. Fetch from notifications (for RH actions)
    try {
      const notifications: any = await query(`
        SELECT 
          n.id,
          n.type,
          n.title,
          n.message,
          n.priority,
          n.created_at,
          u.name as user_name,
          u.email as user_email
        FROM notifications n
        LEFT JOIN User u ON n.user_id = u.id COLLATE utf8mb4_unicode_ci
        WHERE n.type IN ('RH_ACTION_REQUIRED', 'PROFILE_APPROVED', 'PROFILE_REJECTED', 'PROFILE_SUBMITTED', 'SYSTEM_ALERT')
        ORDER BY n.created_at DESC
        LIMIT ${safeLimit}
      `);

      notifications.forEach((notif: any) => {
        let type: Activity['type'] = 'system';
        if (notif.type?.includes('PROFILE')) type = 'profile';
        else if (notif.type?.includes('LEAVE')) type = 'leave';
        else if (notif.type?.includes('POINTAGE')) type = 'pointage';

        activities.push({
          id: `notif_${notif.id}`,
          type,
          action: notif.type,
          userName: notif.user_name || 'Système',
          userEmail: notif.user_email,
          timestamp: notif.created_at,
          status: notif.priority || 'NORMAL',
          details: notif.title,
        });
      });
    } catch (e) {
      console.log('notifications table not found or error:', e);
    }

    // 4. Fetch from anomalies
    try {
      const anomalies: any = await query(`
        SELECT 
          a.id,
          a.type,
          a.severity,
          a.entity_type,
          a.entity_id,
          a.description,
          a.status,
          a.created_at,
          s.user_id,
          u.name as user_name,
          u.email as user_email
        FROM anomalies a
        LEFT JOIN attendance_sessions s ON a.pointage_id = s.id COLLATE utf8mb4_unicode_ci
        LEFT JOIN User u ON s.user_id = u.id COLLATE utf8mb4_unicode_ci
        ORDER BY a.created_at DESC
        LIMIT ${safeLimit}
      `);

      anomalies.forEach((anomaly: any) => {
        activities.push({
          id: `anomaly_${anomaly.id}`,
          type: 'pointage',
          action: `ANOMALY_${anomaly.type}`,
          userName: anomaly.user_name || 'Inconnu',
          userEmail: anomaly.user_email,
          timestamp: anomaly.created_at,
          status: anomaly.severity || 'WARNING',
          details: anomaly.description,
          metadata: {
            anomalyType: anomaly.type,
            anomalyStatus: anomaly.status,
          }
        });
      });
    } catch (e) {
      console.log('anomalies table not found or error:', e);
    }

    // 5. Fetch from Employe (profile submissions)
    try {
      const employees: any = await query(`
        SELECT 
          e.id,
          e.nom,
          e.prenom,
          e.status,
          e.created_at,
          e.updated_at,
          e.approved_at,
          u.name as user_name,
          u.email as user_email
        FROM Employe e
        INNER JOIN User u ON e.user_id = u.id COLLATE utf8mb4_unicode_ci
        ORDER BY e.updated_at DESC
        LIMIT ${safeLimit}
      `);

      employees.forEach((emp: any) => {
        const empName = `${emp.prenom || ''} ${emp.nom || ''}`.trim() || emp.user_name;
        activities.push({
          id: `emp_${emp.id}`,
          type: 'profile',
          action: emp.status === 'EN_ATTENTE' ? 'PROFILE_SUBMITTED' : 
                  emp.status === 'APPROUVE' ? 'PROFILE_APPROVED' : 'PROFILE_REJECTED',
          userName: empName,
          userEmail: emp.user_email,
          timestamp: emp.updated_at || emp.created_at,
          status: emp.status === 'EN_ATTENTE' ? 'PENDING' : 
                  emp.status === 'APPROUVE' ? 'SUCCESS' : 'ERROR',
          details: `Profil employé`,
        });
      });
    } catch (e) {
      console.log('Employe table error:', e);
    }

    // Sort all activities by timestamp DESC
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter by type if specified
    let filteredActivities = activities;
    if (type && type !== 'all') {
      filteredActivities = activities.filter(a => a.type === type);
    }

    // Limit final results
    const result = filteredActivities.slice(0, safeLimit);

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des activités' },
      { status: 500 }
    );
  }
}
