import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/mysql-direct";
import { auditLogger } from "@/lib/services/audit-logger";

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

/**
 * POST /api/documents/upload
 * Upload a document for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('type') as string) || (formData.get('category') as string) || 'autre';
    const documentName = formData.get('name') as string;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Types acceptés: PDF, DOC, DOCX, JPG, PNG, GIF, XLS, XLSX" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse la taille maximale de 5MB" },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    // Get employee record
    let employees: any[] = [];
    try {
      employees = await query(
        `SELECT id, autres_documents FROM Employe WHERE user_id = ?`,
        [session.user.id]
      );
    } catch (e) {
      console.error("Error fetching employee:", e);
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "Profil employé non trouvé. Veuillez d'abord créer votre profil." },
        { status: 404 }
      );
    }

    const employee = employees[0];

    // Parse existing documents
    let existingDocs: any[] = [];
    if (employee.autres_documents) {
      try {
        existingDocs = JSON.parse(employee.autres_documents);
      } catch (e) {
        console.error("Error parsing existing documents:", e);
        existingDocs = [];
      }
    }

    // Add new document
    const newDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: documentName || file.name,
      type: documentType,
      mimeType: file.type,
      size: file.size,
      data: dataUrl,
      uploadedAt: new Date().toISOString()
    };

    existingDocs.push(newDocument);

    // Update employee record with new document
    await execute(
      `UPDATE Employe SET autres_documents = ?, updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(existingDocs), employee.id]
    );

    // Log the document upload
    await auditLogger.logDocument(
      "uploaded",
      newDocument.id,
      session.user.id,
      ipAddress,
      userAgent,
      {
        name: newDocument.name,
        type: documentType,
        mimeType: file.type,
        size: file.size
      }
    );

    return NextResponse.json({
      success: true,
      message: "Document téléchargé avec succès",
      document: {
        id: newDocument.id,
        name: newDocument.name,
        type: newDocument.type,
        mimeType: newDocument.mimeType,
        size: newDocument.size,
        uploadedAt: newDocument.uploadedAt
      }
    });

  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement du document" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/upload
 * Delete a document
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: "ID du document requis" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Get employee record
    let employees: any[] = [];
    try {
      employees = await query(
        `SELECT id, autres_documents FROM Employe WHERE user_id = ?`,
        [session.user.id]
      );
    } catch (e) {
      console.error("Error fetching employee:", e);
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "Profil employé non trouvé" },
        { status: 404 }
      );
    }

    const employee = employees[0];

    // Parse existing documents
    let existingDocs: any[] = [];
    if (employee.autres_documents) {
      try {
        existingDocs = JSON.parse(employee.autres_documents);
      } catch (e) {
        console.error("Error parsing existing documents:", e);
        existingDocs = [];
      }
    }

    // Find and remove the document
    const docIndex = existingDocs.findIndex(d => d.id === documentId);
    if (docIndex === -1) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    const deletedDoc = existingDocs[docIndex];
    existingDocs.splice(docIndex, 1);

    // Update employee record
    await execute(
      `UPDATE Employe SET autres_documents = ?, updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(existingDocs), employee.id]
    );

    // Log the document deletion
    await auditLogger.logDocument(
      "deleted",
      documentId,
      session.user.id,
      ipAddress,
      userAgent,
      {
        name: deletedDoc.name,
        type: deletedDoc.type
      }
    );

    return NextResponse.json({
      success: true,
      message: "Document supprimé avec succès"
    });

  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du document" },
      { status: 500 }
    );
  }
}
