import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/mysql-direct';
import { emailService } from '@/lib/services/email-service';
import { notificationService } from '@/lib/services/notification-service';
import { auditLogger } from '@/lib/services/audit-logger';
import { sanitizeImageFromAPI } from '@/lib/utils';

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

// GET all employees (Super Admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let employees: any[] = [];
    // SUPER_ADMIN: fetch all employees
    if (session.user.role === 'SUPER_ADMIN') {
      employees = await query(`
        SELECT 
          e.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_roleEnum,
          u.createdAt as user_createdAt
        FROM Employe e
        INNER JOIN User u ON e.user_id = u.id
        ORDER BY e.created_at DESC
      `);
    } else if (session.user.role === 'RH') {
      // RH: fetch only validated employees
      employees = await query(`
        SELECT 
          e.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_roleEnum,
          u.createdAt as user_createdAt
        FROM Employe e
        INNER JOIN User u ON e.user_id = u.id
        WHERE e.status = 'APPROUVE'
        ORDER BY e.created_at DESC
      `);
    } else {
      // Other roles: forbidden
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Transform the flat data structure to match the expected format
    // Sanitize image fields to prevent ERR_INVALID_URL
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
      photo: sanitizeImageFromAPI(emp.photo),
      cv: sanitizeImageFromAPI(emp.cv),
      typeContrat: emp.type_contrat,
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
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des employés' },
      { status: 500 }
    );
  }
}

// POST create or update employee profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const ipAddress = getClientIP(req);
    const userAgent = req.headers.get("user-agent") || undefined;
    const {
      nom,
      prenom,
      email,
      birthday,
      sexe,
      rib,
      adresse,
      telephone,
      dateEmbauche,
      photo,
      cv,
      typeContrat,
      autresDocuments,
      userId
    } = body;

    // Convert document array to JSON string
    const autresDocumentsJson = autresDocuments ? JSON.stringify(autresDocuments) : null;

    // If userId is provided, only SUPER_ADMIN can update other users
    const targetUserId = userId || session.user.id;
    if (userId && userId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Check if employee profile exists
    const existingEmployee: any = await query(
      'SELECT * FROM Employe WHERE user_id = ?',
      [targetUserId]
    );

    let employee;

    if (existingEmployee && existingEmployee.length > 0) {
      // Update existing employee - reset to EN_ATTENTE if resubmitting after rejection
      await query(
        `UPDATE Employe SET 
          nom = ?, prenom = ?, email = ?, birthday = ?, sexe = ?,
          rib = ?, adresse = ?, telephone = ?, date_embauche = ?,
          photo = ?, cv = ?, type_contrat = ?,
          autres_documents = ?,
          statut = 'EN_ATTENTE',
          status = 'EN_ATTENTE',
          rejection_reason = NULL,
          approved_by = NULL,
          approved_at = NULL,
          updated_at = NOW()
        WHERE user_id = ?`,
        [
          nom, prenom, email, 
          birthday ? new Date(birthday) : null, 
          sexe, rib, adresse, telephone,
          dateEmbauche ? new Date(dateEmbauche) : null,
          photo, cv, typeContrat,
          autresDocumentsJson,
          targetUserId
        ]
      );
      
      // Update user status to PENDING
      await query(
        `UPDATE User SET status = 'PENDING' WHERE id = ?`,
        [targetUserId]
      );

      // Fetch the updated employee with user info
      const result: any = await query(
        `SELECT 
          e.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM Employe e
        INNER JOIN User u ON e.user_id = u.id
        WHERE e.user_id = ?`,
        [targetUserId]
      );

      employee = result[0];
      
      console.log('✅ Employee profile updated - Status reset to EN_ATTENTE:', {
        employeeId: employee.id,
        userId: targetUserId,
        status: 'EN_ATTENTE'
      });
    } else {
      // Create new employee profile
      // Generate a UUID for the new employee
      const employeeId = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO Employe (
          id, user_id, nom, prenom, email, birthday, sexe,
          rib, adresse, telephone, date_embauche, photo, cv, type_contrat,
          autres_documents, statut, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId, targetUserId, nom, prenom, email,
          birthday ? new Date(birthday) : null,
          sexe, rib, adresse, telephone,
          dateEmbauche ? new Date(dateEmbauche) : null,
          photo, cv, typeContrat,
          autresDocumentsJson,
          'EN_ATTENTE',
          'EN_ATTENTE'
        ]
      );
      
      // Update user status to PENDING
      await query(
        `UPDATE User SET status = 'PENDING' WHERE id = ?`,
        [targetUserId]
      );

      // Fetch the created employee with user info
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

      employee = result[0];
    }

    // Format the response
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
      user: {
        id: employee.user_id,
        name: employee.user_name,
        email: employee.user_email,
      }
    };

    // Log the employee profile action
    const isUpdate = existingEmployee && existingEmployee.length > 0;
    if (isUpdate) {
      await auditLogger.logEmployeeAction(
        "updated",
        employee.id,
        session.user.id,
        ipAddress,
        userAgent,
        { 
          changes: { 
            nom, prenom, email, typeContrat,
            hasPhoto: !!photo,
            hasCV: !!cv,
            hasDocuments: !!autresDocuments
          }
        }
      );
    } else {
      await auditLogger.logEmployeeAction(
        "created",
        employee.id,
        session.user.id,
        ipAddress,
        userAgent,
        { 
          changes: { 
            nom, prenom, email, typeContrat,
            hasPhoto: !!photo,
            hasCV: !!cv,
            hasDocuments: !!autresDocuments
          }
        }
      );
    }

    // Notify all RH users of new pending employee
    try {
      const rhUsers: any = await query(
        `SELECT id, email, name FROM User WHERE role IN ('RH', 'SUPER_ADMIN')`
      );
      
      if (rhUsers && rhUsers.length > 0) {
        const employeeName = `${employee.prenom || ''} ${employee.nom || ''}`.trim() || employee.email;
        
        // Send notifications to RH
        const rhUserIds = rhUsers.map((rh: any) => rh.id);
        await notificationService.notifyRHProfileSubmitted(rhUserIds, employeeName, targetUserId);
        
        // Send notification to user
        await notificationService.notifyUserProfileSubmitted(targetUserId);
        
        // Send emails to RH
        for (const rh of rhUsers) {
          await emailService.notifyRHNewEmployee(
            rh.email,
            employeeName,
            employee.id
          );
        }
      }
    } catch (notifError) {
      console.error('Error sending notifications to RH:', notifError);
      // Continue even if notification fails
    }

    return NextResponse.json(formattedEmployee);
  } catch (error) {
    console.error('Error creating/updating employee:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création/mise à jour du profil employé' },
      { status: 500 }
    );
  }
}
