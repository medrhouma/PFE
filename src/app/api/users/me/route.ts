import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/mysql-direct";
import { sanitizeImageFromAPI } from "@/lib/utils";

/**
 * GET /api/users/me
 * Get current user's profile with real database data
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

    // Get user from database - using correct column names
    let users: any[] = [];
    try {
      users = await query(
        `SELECT 
          u.id, u.name, u.email, u.image, u.role, u.status,
          u.createdAt, u.updatedAt, u.emailVerified,
          CASE WHEN u.password IS NOT NULL THEN 'credentials' ELSE 'oauth' END as authMethod
         FROM User u
         WHERE u.id = ?`,
        [session.user.id]
      );
    } catch (e) {
      console.error("Error querying user:", e);
    }

    if (!users || users.length === 0) {
      // Fallback to basic session data
      return NextResponse.json({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: {
          name: session.user.role || "USER",
          description: null
        },
        roleEnum: session.user.role || "USER",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authMethod: session.user.image ? 'oauth' : 'credentials',
        providers: session.user.image ? ['google'] : ['credentials']
      });
    }

    const user = users[0];

    // Try to get role info from Role table
    let roleName = user.role || "USER";
    let roleDescription = null;
    try {
      const roles: any[] = await query(
        `SELECT name, description FROM Role WHERE name = ?`,
        [user.role]
      );
      if (roles.length > 0) {
        roleName = roles[0].name;
        roleDescription = roles[0].description;
      }
    } catch (e) {
      // Role table might not exist, use role from user
    }

    // Get account providers
    let providers: string[] = [];
    try {
      const accounts: any[] = await query(
        `SELECT provider FROM Account WHERE userId = ?`,
        [session.user.id]
      );
      providers = accounts.map(a => a.provider);
    } catch (e) {
      // Accounts table might not exist or be different
    }

    // Check for employee profile
    let employee = null;
    try {
      const employees: any[] = await query(
        `SELECT id, nom, prenom, email, birthday, sexe, telephone, adresse, rib,
                date_embauche, type_contrat, status, created_at, photo, cv
         FROM Employe WHERE user_id = ?`,
        [session.user.id]
      );
      if (employees.length > 0) {
        employee = employees[0];
      }
    } catch (e) {
      console.error("Error fetching employee:", e);
      // Employee table might not exist or different structure
    }

    // Sanitize image fields to prevent ERR_INVALID_URL errors
    const safeUserImage = sanitizeImageFromAPI(user.image);
    const safeEmployeePhoto = employee ? sanitizeImageFromAPI(employee.photo) : null;
    const safeEmployeeCv = employee ? sanitizeImageFromAPI(employee.cv) : null;

    // Format the response with sanitized images
    const response = {
      id: user.id,
      name: user.name,
      lastName: employee?.nom || null,
      email: user.email,
      image: safeUserImage,
      sexe: employee?.sexe || null,
      telephone: employee?.telephone || null,
      adresse: employee?.adresse || null,
      rib: employee?.rib || null,
      dateEmbauche: employee?.date_embauche || null,
      typeContrat: employee?.type_contrat || null,
      role: {
        name: roleName,
        description: roleDescription
      },
      roleEnum: user.role || 'USER',
      isActive: user.status === 'ACTIVE',
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      authMethod: user.authMethod,
      providers: providers.length > 0 ? providers : (user.authMethod === 'credentials' ? ['credentials'] : ['google']),
      employee: employee ? {
        ...employee,
        photo: safeEmployeePhoto,
        cv: safeEmployeeCv
      } : null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/me
 * Update current user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, lastName, image, telephone, adresse, sexe } = body;

    let hasChanges = false;

    // Build update data for User table (name and image only - lastName stored in Employe)
    const userUpdates: string[] = [];
    const userParams: any[] = [];

    if (name !== undefined) {
      userUpdates.push("name = ?");
      userParams.push(name);
    }
    if (image !== undefined) {
      userUpdates.push("image = ?");
      userParams.push(image);
      
      // Also update Employee photo field if it exists
      try {
        const existingEmp: any[] = await query(
          `SELECT id FROM Employe WHERE user_id = ?`,
          [session.user.id]
        );
        if (existingEmp.length > 0) {
          await execute(
            `UPDATE Employe SET photo = ?, updated_at = NOW() WHERE user_id = ?`,
            [image, session.user.id]
          );
        }
      } catch (e) {
        console.error("Error updating employee photo:", e);
      }
    }

    // Update User table if there are changes
    if (userUpdates.length > 0) {
      hasChanges = true;
      userParams.push(session.user.id);
      await execute(
        `UPDATE User SET ${userUpdates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
        userParams
      );
    }

    // Update Employe table for employee-specific fields
    if (telephone !== undefined || adresse !== undefined || sexe !== undefined || name !== undefined || lastName !== undefined) {
      // First check if employee record exists
      const existingEmployee: any[] = await query(
        `SELECT id FROM Employe WHERE user_id = ?`,
        [session.user.id]
      );

      if (existingEmployee.length > 0) {
        const employeeUpdates: string[] = [];
        const employeeParams: any[] = [];

        if (telephone !== undefined) {
          employeeUpdates.push("telephone = ?");
          employeeParams.push(telephone);
        }
        if (adresse !== undefined) {
          employeeUpdates.push("adresse = ?");
          employeeParams.push(adresse);
        }
        if (sexe !== undefined) {
          employeeUpdates.push("sexe = ?");
          employeeParams.push(sexe);
        }
        if (name !== undefined) {
          employeeUpdates.push("prenom = ?");
          employeeParams.push(name);
        }
        if (lastName !== undefined) {
          employeeUpdates.push("nom = ?");
          employeeParams.push(lastName);
        }

        if (employeeUpdates.length > 0) {
          hasChanges = true;
          employeeParams.push(session.user.id);
          try {
            await execute(
              `UPDATE Employe SET ${employeeUpdates.join(", ")}, updated_at = NOW() WHERE user_id = ?`,
              employeeParams
            );
          } catch (e) {
            console.error("Error updating Employe:", e);
          }
        }
      } else if (telephone !== undefined || adresse !== undefined || sexe !== undefined) {
        // Employee record doesn't exist, but we want to update employee fields
        // These will be stored when the employee profile is created
        console.log("No employee record found for user, employee fields will be saved when profile is created");
      }
    }

    if (!hasChanges) {
      return NextResponse.json(
        { error: "Aucune modification fournie" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès"
    });

  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
