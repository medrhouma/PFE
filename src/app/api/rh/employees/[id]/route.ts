/**
 * RH Employee Details API
 * Get complete employee dossier with all documents
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, SessionUser } from "@/lib/rbac";
import { query } from "@/lib/mysql-direct";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(
    async (request: NextRequest, user: SessionUser) => {
      try {
        // Get complete employee profile
        const employees = await query(
          `SELECT e.*, u.id as user_id, u.name, u.last_name, u.email, u.emailVerified, 
                  u.telephone as user_telephone, u.adresse as user_adresse, u.role, u.status as user_status,
                  u.created_at, u.updated_at
           FROM Employe e
           LEFT JOIN User u ON e.userId = u.id
           WHERE e.id = ? LIMIT 1`,
          [id]
        ) as any[];

        if (!employees || employees.length === 0) {
          return NextResponse.json(
            { error: "Employee not found" },
            { status: 404 }
          );
        }

        const employee = employees[0];

        // Get RH decisions with decider info
        const rhDecisions = await query(
          `SELECT rd.*, d.id as decider_id, d.name as decider_name, d.email as decider_email
           FROM RHDecision rd
           LEFT JOIN User d ON rd.deciderId = d.id
           WHERE rd.employeId = ?
           ORDER BY rd.createdAt DESC`,
          [id]
        ) as any[];

        // Get employee documents
        const dossiers = await query(
          `SELECT * FROM DossierEmploye WHERE userId = ? ORDER BY dateObtention DESC`,
          [employee.userId]
        ) as any[];

        // Parse autres_documents if exists
        let autresDocuments = [];
        if (employee.autresDocuments) {
          try {
            autresDocuments = JSON.parse(employee.autresDocuments);
          } catch (e) {
            console.error("Error parsing autresDocuments:", e);
          }
        }

        // Format user data
        const userData = {
          id: employee.user_id,
          name: employee.name,
          lastName: employee.last_name,
          email: employee.email,
          emailVerified: employee.emailVerified,
          telephone: employee.user_telephone,
          adresse: employee.user_adresse,
          roleEnum: employee.role,
          status: employee.user_status,
          createdAt: employee.created_at,
          updatedAt: employee.updated_at,
        };

        // Format RH decisions with decider
        const formattedDecisions = rhDecisions.map((rd: any) => ({
          ...rd,
          decider: rd.decider_id ? {
            id: rd.decider_id,
            name: rd.decider_name,
            email: rd.decider_email,
          } : null,
        }));

        // Return complete dossier
        return NextResponse.json({
          employee: {
            ...employee,
            user: userData,
            autresDocuments, // Parsed JSON
          },
          dossiers, // Official documents (diplomes, certificats, etc.)
          history: formattedDecisions, // Decision history
          stats: {
            totalDocuments: dossiers.length + autresDocuments.length,
            hasPhoto: !!employee.photo,
            hasCv: !!employee.cv,
            profileCompletion: calculateProfileCompletion(employee),
          },
        });
      } catch (error: any) {
        console.error("Error fetching employee dossier:", error);
        return NextResponse.json(
          { error: "Failed to fetch employee dossier" },
          { status: 500 }
        );
      }
    },
    { roles: ["SUPER_ADMIN", "RH"] }
  )(req);
}

// Helper function to calculate profile completion percentage
function calculateProfileCompletion(employee: any): number {
  const requiredFields = [
    "nom",
    "prenom",
    "email",
    "birthday",
    "sexe",
    "telephone",
    "adresse",
    "dateEmbauche",
    "typeContrat",
    "photo",
    "cv",
  ];

  const filledFields = requiredFields.filter(
    (field) => employee[field] !== null && employee[field] !== undefined && employee[field] !== ""
  );

  return Math.round((filledFields.length / requiredFields.length) * 100);
}
