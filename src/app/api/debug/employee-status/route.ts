/**
 * Debug endpoint to check all employee statuses
 */

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

    // Only SUPER_ADMIN can view this debug info
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Get all employees with their statuses
    const employees: any = await query(`
      SELECT 
        e.id,
        e.user_id,
        e.nom,
        e.prenom,
        e.email,
        e.status as employe_status,
        e.rejection_reason,
        e.approved_by,
        e.approved_at,
        e.created_at,
        e.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.status as user_status,
        u.roleEnum
      FROM Employe e
      INNER JOIN User u ON e.user_id = u.id
      ORDER BY e.updated_at DESC
    `);

    // Group by status
    const grouped = {
      EN_ATTENTE: employees.filter((e: any) => e.employe_status === 'EN_ATTENTE'),
      APPROUVE: employees.filter((e: any) => e.employe_status === 'APPROUVE'),
      REJETE: employees.filter((e: any) => e.employe_status === 'REJETE'),
    };

    return NextResponse.json({
      total: employees.length,
      byStatus: {
        EN_ATTENTE: grouped.EN_ATTENTE.length,
        APPROUVE: grouped.APPROUVE.length,
        REJETE: grouped.REJETE.length,
      },
      employees: {
        EN_ATTENTE: grouped.EN_ATTENTE,
        APPROUVE: grouped.APPROUVE,
        REJETE: grouped.REJETE,
      },
      raw: employees
    });
  } catch (error) {
    console.error('Error in debug status:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statuts' },
      { status: 500 }
    );
  }
}
