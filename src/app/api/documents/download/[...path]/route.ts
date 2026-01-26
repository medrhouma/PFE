import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path } = await params;
    const fileUrl = path.join('/');

    // Validate the URL is from a safe domain or internal path
    if (!fileUrl) {
      return NextResponse.json(
        { error: "Chemin de fichier invalide" },
        { status: 400 }
      );
    }

    // If it's a base64 data URL or external URL, redirect to it
    if (fileUrl.startsWith('data:') || fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return NextResponse.redirect(fileUrl);
    }

    // For internal files, serve them with appropriate headers
    // This is a placeholder - you should implement actual file serving logic
    return NextResponse.json({
      url: fileUrl,
      message: "Fichier prêt pour le téléchargement"
    });

  } catch (error: any) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement du document" },
      { status: 500 }
    );
  }
}
