/**
 * RH Pending Employees API
 * Get all employees waiting for validation
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { query } from "@/lib/mysql-direct";
import type { RowDataPacket } from "mysql2";

interface EmployeeRow extends RowDataPacket {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_naissance: Date;
  adresse: string;
  ville: string;
  code_postal: string;
  departement: string;
  poste: string;
  date_embauche: Date;
  type_contrat: string;
  status: string;
  created_at: Date;
  user_name: string;
  user_last_name: string;
  user_email: string;
  user_role: string;
  user_created_at: Date;
}

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const employees = await query<EmployeeRow[]>(`
        SELECT 
          e.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          u.createdAt as user_created_at
        FROM Employe e
        LEFT JOIN User u ON e.user_id = u.id
        WHERE e.status = 'EN_ATTENTE'
        ORDER BY e.createdAt ASC
      `);
      
      // Format response to match Prisma structure
      const formatted = employees.map(emp => ({
        id: emp.id,
        userId: emp.user_id,
        nom: emp.nom,
        prenom: emp.prenom,
        email: emp.email,
        telephone: emp.telephone,
        dateNaissance: emp.date_naissance,
        adresse: emp.adresse,
        ville: emp.ville,
        codePostal: emp.code_postal,
        departement: emp.departement,
        poste: emp.poste,
        dateEmbauche: emp.date_embauche,
        typeContrat: emp.type_contrat,
        status: emp.status,
        createdAt: emp.created_at,
        user: emp.user_id ? {
          id: emp.user_id,
          name: emp.user_name,
          lastName: emp.user_last_name,
          email: emp.user_email,
          roleEnum: emp.user_role,
          createdAt: emp.user_created_at,
        } : null,
      }));
      
      return NextResponse.json(formatted);
    } catch (error: any) {
      console.error("Error fetching pending employees:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending employees" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
