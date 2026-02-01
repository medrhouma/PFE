import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// File size limit: 10MB for contracts
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/contracts/upload
 * Upload a contract PDF file (RH/SUPER_ADMIN only)
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

    // Only RH and SUPER_ADMIN can upload contracts
    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Validate file type - only PDF for contracts
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "Seuls les fichiers PDF sont autorisés pour les contrats" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse la taille maximale de 10MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `contract_${timestamp}_${randomStr}_${sanitizedName}`;

    // Ensure the contracts upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contracts');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/contracts/${filename}`;

    console.log(`✅ Contract PDF uploaded: ${publicPath}`);

    return NextResponse.json({
      success: true,
      message: "Contrat téléchargé avec succès",
      url: publicPath,
      path: publicPath,
      filename,
      size: file.size
    });

  } catch (error) {
    console.error("Error uploading contract:", error);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement du contrat" },
      { status: 500 }
    );
  }
}
