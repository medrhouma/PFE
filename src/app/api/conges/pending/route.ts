import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Only RH and SUPER_ADMIN can view pending requests
    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const requests: any = await query(
      `SELECT dc.*, u.name as user_name, u.email as user_email
       FROM demande_conge dc
       JOIN User u ON dc.userId = u.id
       WHERE dc.status = 'EN_ATTENTE'
       ORDER BY dc.date_debut DESC`
    );

    const formattedRequests = requests.map((req: any) => ({
      id: req.id,
      type: req.type,
      startDate: req.date_debut,
      endDate: req.date_fin,
      duration: Math.ceil((new Date(req.date_fin).getTime() - new Date(req.date_debut).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      reason: req.commentaire,
      status: req.status,
      createdAt: req.date_debut,
      user: {
        name: req.user_name,
        email: req.user_email,
      },
    }));

    return NextResponse.json({ requests: formattedRequests });
  } catch (error: any) {
    console.error("Error fetching pending leave requests:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    );
  }
}
