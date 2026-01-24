import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';

// PATCH update employee status (RH only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Only RH can approve/reject employees
    if (session.user.role !== 'RH' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await req.json();
    const { statut } = body;

    if (!statut || !['APPROUVE', 'REJETE'].includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const { id: employeeId } = await params;

    // Update employee status
    await query(
      `UPDATE Employe SET statut = ?, updated_at = NOW() WHERE id = ?`,
      [statut, employeeId]
    );

    // Fetch the updated employee
    const result: any = await query(
      `SELECT 
        e.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
      FROM Employe e
      INNER JOIN User u ON e.user_id = u.id
      WHERE e.id = ?`,
      [employeeId]
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    const employee = result[0];

    const formattedEmployee = {
      id: employee.id,
      userId: employee.user_id,
      nom: employee.nom,
      prenom: employee.prenom,
      email: employee.email,
      birthday: employee.birthday,
      sexe: employee.sexe,
      rib: employee.rib,
      adresse: employee.adresse,
      telephone: employee.telephone,
      dateEmbauche: employee.date_embauche,
      photo: employee.photo,
      cv: employee.cv,
      typeContrat: employee.type_contrat,
      statut: employee.statut,
      user: {
        id: employee.user_id,
        name: employee.user_name,
        email: employee.user_email,
      }
    };

    return NextResponse.json(formattedEmployee);
  } catch (error) {
    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}
