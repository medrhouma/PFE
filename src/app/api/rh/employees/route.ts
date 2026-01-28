/**
 * RH Employees List API
 * Get all employees with filters
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
  user_status: string;
  user_created_at: Date;
  decision_id: string;
  decision: string;
  decision_reason: string;
  decision_comments: string;
  decision_created_at: Date;
  decider_name: string;
  decider_last_name: string;
  decider_email: string;
}

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const search = searchParams.get("search");
      
      let sql = `
        SELECT 
          e.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          u.status as user_status,
          u.createdAt as user_created_at,
          rd.id as decision_id,
          rd.decision,
          rd.reason as decision_reason,
          rd.comments as decision_comments,
          rd.createdAt as decision_created_at,
          dec.name as decider_name,
          dec.email as decider_email
        FROM Employe e
        LEFT JOIN User u ON e.user_id = u.id
        LEFT JOIN (
          SELECT * FROM RHDecision rd1
          WHERE rd1.createdAt = (
            SELECT MAX(rd2.createdAt) FROM RHDecision rd2 WHERE rd2.employe_id = rd1.employe_id
          )
        ) rd ON rd.employe_id = e.id
        LEFT JOIN User dec ON rd.decider_id = dec.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (status) {
        sql += ` AND e.status = ?`;
        params.push(status);
      }
      
      if (search) {
        sql += ` AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.email LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
      
      sql += ` ORDER BY e.createdAt DESC`;
      
      const employees = await query<EmployeeRow[]>(sql, params);
      
      // Format response to match expected structure
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
          status: emp.user_status,
          createdAt: emp.user_created_at,
        } : null,
        rhDecisions: emp.decision_id ? [{
          id: emp.decision_id,
          decision: emp.decision,
          reason: emp.decision_reason,
          comments: emp.decision_comments,
          createdAt: emp.decision_created_at,
          decider: {
            name: emp.decider_name,
            lastName: emp.decider_last_name,
            email: emp.decider_email,
          },
        }] : [],
      }));
      
      return NextResponse.json(formatted);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      return NextResponse.json(
        { error: "Failed to fetch employees" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
