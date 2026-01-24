import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';

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

    // Fetch recent employee activities (last 10)
    const activities: any = await query(`
      SELECT 
        e.id,
        e.nom,
        e.prenom,
        e.statut,
        e.created_at,
        e.updated_at,
        u.name as user_name
      FROM Employe e
      INNER JOIN User u ON e.user_id = u.id
      ORDER BY e.updated_at DESC
      LIMIT 10
    `);

    // Format the activities
    const formattedActivities = activities.map((activity: any) => ({
      id: activity.id,
      employeeName: `${activity.prenom || ''} ${activity.nom || ''}`.trim() || activity.user_name,
      action: activity.statut === 'EN_ATTENTE' ? 'submitted' : 
              activity.statut === 'APPROUVE' ? 'approved' : 'rejected',
      status: activity.statut,
      timestamp: activity.updated_at || activity.created_at,
    }));

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des activités' },
      { status: 500 }
    );
  }
}
