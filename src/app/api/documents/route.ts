import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

/**
 * GET /api/documents
 * Get current user's documents (CV, photo, autres_documents from Employe table)
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

    // Get employee profile with documents
    let employee: any = null;
    try {
      const employees = await query(
        `SELECT id, nom, prenom, email, photo, cv, autres_documents, status, created_at
         FROM Employe WHERE user_id = ?`,
        [session.user.id]
      ) as any[];
      
      if (employees.length > 0) {
        employee = employees[0];
      }
    } catch (e) {
      console.error("Error fetching employee documents:", e);
    }

    // Parse autres_documents if present
    let autresDocuments: any[] = [];
    if (employee?.autres_documents) {
      try {
        autresDocuments = JSON.parse(employee.autres_documents);
      } catch (e) {
        console.error("Error parsing autres_documents:", e);
      }
    }

    // Format documents for response
    const documents: any[] = [];

    // Add CV if present
    if (employee?.cv) {
      documents.push({
        id: 'cv',
        name: 'Curriculum Vitae',
        type: 'cv',
        category: 'personnel',
        data: employee.cv,
        uploadedAt: employee.created_at,
        icon: 'file-text'
      });
    }

    // Add photo if present
    if (employee?.photo) {
      documents.push({
        id: 'photo',
        name: 'Photo de profil',
        type: 'photo',
        category: 'personnel',
        data: employee.photo,
        uploadedAt: employee.created_at,
        icon: 'image'
      });
    }

    // Add other documents
    autresDocuments.forEach((doc, index) => {
      documents.push({
        id: `doc_${index}`,
        name: doc.name || `Document ${index + 1}`,
        type: doc.type || 'autre',
        category: getDocumentCategory(doc.type),
        data: doc.data,
        uploadedAt: employee?.created_at,
        icon: getDocumentIcon(doc.type)
      });
    });

    return NextResponse.json({
      documents,
      employee: employee ? {
        id: employee.id,
        nom: employee.nom,
        prenom: employee.prenom,
        status: employee.status
      } : null,
      hasProfile: !!employee
    });

  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    );
  }
}

function getDocumentCategory(type: string | undefined): string {
  switch (type) {
    case 'formation':
    case 'diplome':
      return 'formation';
    case 'experience':
      return 'experience';
    case 'contrat':
      return 'contrat';
    default:
      return 'autre';
  }
}

function getDocumentIcon(type: string | undefined): string {
  switch (type) {
    case 'formation':
    case 'diplome':
      return 'award';
    case 'experience':
      return 'briefcase';
    case 'contrat':
      return 'file-text';
    case 'photo':
      return 'image';
    default:
      return 'file';
  }
}
