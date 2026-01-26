/**
 * Debug endpoint to check pending employees using direct SQL
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

    // Only RH and SUPER_ADMIN can view pending employees
    if (!['RH', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Direct SQL query
    const employees: any = await query(`
      SELECT 
        e.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.roleEnum as user_roleEnum,
        u.status as user_status,
        u.createdAt as user_createdAt
      FROM Employe e
      INNER JOIN User u ON e.user_id = u.id
      WHERE e.statut = 'EN_ATTENTE'
      ORDER BY e.created_at ASC
    `);

    // Format the response
    const formattedEmployees = employees.map((emp: any) => ({
      id: emp.id,
      userId: emp.user_id,
      nom: emp.nom,
      prenom: emp.prenom,
      email: emp.email,
      birthday: emp.birthday,
      sexe: emp.sexe,
      rib: emp.rib,
      adresse: emp.adresse,
      telephone: emp.telephone,
      dateEmbauche: emp.date_embauche,
      photo: emp.photo,
      cv: emp.cv,
      typeContrat: emp.type_contrat,
      status: emp.status,
      rejectionReason: emp.rejection_reason,
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
      user: {
        id: emp.user_id,
        name: emp.user_name,
        email: emp.user_email,
        roleEnum: emp.user_roleEnum,
        status: emp.user_status,
        createdAt: emp.user_createdAt,
      }
    }));

    return NextResponse.json({
      count: formattedEmployees.length,
      employees: formattedEmployees
    });
  } catch (error) {
    console.error('Error fetching pending employees (SQL):', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des employés en attente' },
      { status: 500 }
    );
  }
}
