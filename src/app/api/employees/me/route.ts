import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';

// GET current user's employee profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const result: any = await query(
      `SELECT 
        e.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_roleEnum
      FROM Employe e
      INNER JOIN User u ON e.user_id = u.id
      WHERE e.user_id = ?`,
      [session.user.id]
    );

    if (!result || result.length === 0) {
      return NextResponse.json({ employee: null });
    }

    const emp = result[0];
    const employee = {
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
      user: {
        id: emp.user_id,
        name: emp.user_name,
        email: emp.user_email,
        roleEnum: emp.user_roleEnum,
      }
    };

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil employé' },
      { status: 500 }
    );
  }
}
