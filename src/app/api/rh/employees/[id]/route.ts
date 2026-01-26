/**
 * RH Employee Details API
 * Get complete employee dossier with all documents
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, SessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  return withAuth(
    async (request: NextRequest, user: SessionUser) => {
      try {
        // Get complete employee profile with all relations
        const employee = await prisma.employe.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                emailVerified: true,
                telephone: true,
                adresse: true,
                roleEnum: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            rhDecisions: {
              include: {
                decider: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!employee) {
          return NextResponse.json(
            { error: "Employee not found" },
            { status: 404 }
          );
        }

        // Get employee documents
        const dossiers = await prisma.dossierEmploye.findMany({
          where: { userId: employee.userId },
          orderBy: { dateObtention: "desc" },
        });

        // Parse autres_documents if exists
        let autresDocuments = [];
        if (employee.autresDocuments) {
          try {
            autresDocuments = JSON.parse(employee.autresDocuments);
          } catch (e) {
            console.error("Error parsing autresDocuments:", e);
          }
        }

        // Return complete dossier
        return NextResponse.json({
          employee: {
            ...employee,
            autresDocuments, // Parsed JSON
          },
          dossiers, // Official documents (diplomes, certificats, etc.)
          history: employee.rhDecisions, // Decision history
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
