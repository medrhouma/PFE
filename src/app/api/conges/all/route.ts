import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

// GET - Récupérer TOUTES les demandes de congé (RH/Admin uniquement)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est RH ou SUPER_ADMIN
    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé - Réservé au RH" },
        { status: 403 }
      );
    }

    console.log("📋 Fetching all leave requests for RH/Admin...");

    const requests: any = await query(
      `SELECT dc.*, u.name as userName, u.email as userEmail 
       FROM demande_conge dc
       JOIN User u ON dc.userId = u.id
       ORDER BY dc.date_debut DESC`
    );

    console.log(`✅ Found ${requests?.length || 0} leave requests`);

    const formattedRequests = requests.map((req: any) => {
      // Calculate duration in days
      const start = new Date(req.date_debut);
      const end = new Date(req.date_fin);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: req.id,
        type: req.type,
        startDate: req.date_debut,
        endDate: req.date_fin,
        duration: duration,
        reason: req.commentaire || "",
        status: req.status,
        createdAt: req.created_at || new Date().toISOString(),
        userName: req.userName || "N/A",
        userEmail: req.userEmail || ""
      };
    });

    return NextResponse.json(formattedRequests);
  } catch (error: any) {
    console.error("Error fetching all leave requests:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    );
  }
}
