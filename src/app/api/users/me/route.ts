import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/mysql-direct";

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

    // Get user from database - simplified query without role join first
    let users: any[] = [];
    try {
      users = await query(
        `SELECT 
          u.id, u.name, u.last_name, u.email, u.image, u.sexe, u.telephone, u.adresse,
          u.rib, u.date_embauche, u.type_contrat, u.roleEnum, u.status, u.is_active,
          u.createdAt, u.updatedAt, u.email_verified, u.roleId,
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

    // Try to get role info from RoleEntity table (mapped to 'roles')
    let roleName = user.roleEnum || "USER";
    let roleDescription = null;
    if (user.roleId) {
      try {
        const roles: any[] = await query(
          `SELECT name, description FROM roles WHERE id = ?`,
          [user.roleId]
        );
        if (roles.length > 0) {
          roleName = roles[0].name;
          roleDescription = roles[0].description;
        }
      } catch (e) {
        // roles table might not exist, use roleEnum
      }
    }

    // Get account providers
    let providers: string[] = [];
    try {
      const accounts: any[] = await query(
        `SELECT provider FROM accounts WHERE user_id = ?`,
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
        `SELECT id, nom, prenom, email, birthday, sexe, telephone, adresse, position, department, 
                date_embauche, type_contrat, status, created_at, photo, cv
         FROM Employe WHERE user_id = ?`,
        [session.user.id]
      );
      if (employees.length > 0) {
        employee = employees[0];
      }
    } catch (e) {
      // Employee table might not exist
    }

    // Format the response
    const response = {
      id: user.id,
      name: user.name,
      lastName: user.last_name,
      email: user.email,
      image: user.image,
      sexe: user.sexe,
      telephone: user.telephone,
      adresse: user.adresse,
      rib: user.rib,
      dateEmbauche: user.date_embauche,
      typeContrat: user.type_contrat,
      role: {
        name: roleName,
        description: roleDescription
      },
      roleEnum: user.roleEnum,
      isActive: user.is_active,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.email_verified,
      authMethod: user.authMethod,
      providers: providers.length > 0 ? providers : (user.authMethod === 'credentials' ? ['credentials'] : ['google']),
      employee: employee
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

    // Build update data dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (lastName !== undefined) {
      updates.push("last_name = ?");
      params.push(lastName);
    }
    if (image !== undefined) {
      updates.push("image = ?");
      params.push(image);
    }
    if (telephone !== undefined) {
      updates.push("telephone = ?");
      params.push(telephone);
    }
    if (adresse !== undefined) {
      updates.push("adresse = ?");
      params.push(adresse);
    }
    if (sexe !== undefined) {
      updates.push("sexe = ?");
      params.push(sexe);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Aucune modification fournie" },
        { status: 400 }
      );
    }

    // Use updatedAt (mapped to updated_at in DB) - try both column names
    params.push(session.user.id);

    try {
      await execute(
        `UPDATE User SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
        params
      );
    } catch (e: any) {
      // If updatedAt doesn't work, try updated_at
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await execute(
          `UPDATE User SET ${updates.join(", ")} WHERE id = ?`,
          params
        );
      } else {
        throw e;
      }
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
