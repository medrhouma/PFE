import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';
import { notificationService } from '@/lib/services/notification-service';

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
    const { statut, rejectionReason } = body;

    if (!statut || !['APPROUVE', 'REJETE'].includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // Si rejeté, une raison peut être fournie (optionnelle)
    const reason = statut === 'REJETE' ? (rejectionReason || 'Informations incorrectes ou incomplètes') : null;

    const { id: employeeId } = await params;

    // Fetch employee first to get user_id
    const empResult: any = await query(
      `SELECT user_id FROM Employe WHERE id = ?`,
      [employeeId]
    );

    if (!empResult || empResult.length === 0) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    const userId = empResult[0].user_id;

    // Update Employee status (only 'status' column exists, not 'statut')
    if (statut === 'REJETE') {
      // Pour les rejets, inclure la raison et réinitialiser les champs d'approbation
      await query(
        `UPDATE Employe SET 
          status = ?, 
          rejection_reason = ?,
          approved_by = NULL,
          approved_at = NULL,
          updated_at = NOW() 
        WHERE id = ?`,
        [statut, reason, employeeId]
      );
    } else if (statut === 'APPROUVE') {
      // Pour les approbations, enregistrer qui a approuvé et quand
      await query(
        `UPDATE Employe SET 
          status = ?, 
          rejection_reason = NULL,
          approved_by = ?,
          approved_at = NOW(),
          updated_at = NOW() 
        WHERE id = ?`,
        [statut, session.user.id, employeeId]
      );
    } else {
      // Autre statut (EN_ATTENTE)
      await query(
        `UPDATE Employe SET status = ?, updated_at = NOW() WHERE id = ?`,
        [statut, employeeId]
      );
    }

    // Update User status based on employee status
    const userStatus = statut === 'APPROUVE' ? 'ACTIVE' : statut === 'REJETE' ? 'REJECTED' : 'PENDING';
    await query(
      `UPDATE User SET status = ? WHERE id = ?`,
      [userStatus, userId]
    );

    console.log(`✅ Updated Employee status to ${statut} and User status to ${userStatus} for employee ${employeeId}`);

    // Send notifications based on status change
    try {
      if (statut === 'APPROUVE') {
        await notificationService.notifyProfileApproved(userId, session.user.name || 'l\'équipe RH');
      } else if (statut === 'REJETE') {
        await notificationService.notifyProfileRejected(userId, reason || 'Veuillez vérifier vos informations');
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Continue even if notification fails
    }

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
      statut: employee.status,
      status: employee.status,
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
