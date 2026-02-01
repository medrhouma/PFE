import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';

// GET pending employees (RH only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Only RH can view pending employees
    if (session.user.role !== 'RH' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Fetch pending employees with user info
    const employees: any = await query(`
      SELECT 
        e.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_roleEnum
      FROM Employe e
      INNER JOIN User u ON e.user_id = u.id
      WHERE e.status = 'EN_ATTENTE'
      ORDER BY e.created_at DESC
    `);

    // Transform the flat data structure to match the expected format
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
      statut: emp.statut,
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
      user: {
        id: emp.user_id,
        name: emp.user_name,
        email: emp.user_email,
        roleEnum: emp.user_roleEnum,
        createdAt: emp.user_createdAt,
      }
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching pending employees:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des profils en attente' },
      { status: 500 }
    );
  }
}
