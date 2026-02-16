export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { v4 as uuidv4 } from "uuid";

// POST - Dupliquer les jours fériés récurrents d'une année vers une autre
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { fromYear, toYear } = body;

    if (!fromYear || !toYear) {
      return NextResponse.json(
        { error: "Champs requis manquants (fromYear, toYear)" },
        { status: 400 }
      );
    }

    // Récupérer les jours fériés récurrents de l'année source
    const sourceHolidays: any = await query(
      `SELECT * FROM jour_ferie WHERE annee = ? AND recurrent = true`,
      [fromYear]
    );

    if (!sourceHolidays || sourceHolidays.length === 0) {
      return NextResponse.json(
        { error: "Aucun jour férié récurrent trouvé pour cette année" },
        { status: 404 }
      );
    }

    const now = new Date();
    let duplicated = 0;
    let skippedReligious = 0;

    for (const h of sourceHolidays) {
      // Pour les jours religieux (non récurrents en date), on les copie mais avec un warning
      const originalDate = new Date(h.date);
      const newDate = new Date(originalDate);
      newDate.setFullYear(toYear);

      // Vérifier si un jour férié avec le même nom existe déjà pour l'année cible
      const existing: any = await query(
        `SELECT id FROM jour_ferie WHERE nom = ? AND annee = ?`,
        [h.nom, toYear]
      );

      if (existing && existing.length > 0) {
        continue; // Skip duplicates
      }

      const id = uuidv4();
      const isReligious = h.type === "RELIGIEUX";

      await query(
        `INSERT INTO jour_ferie (id, nom, date, type, recurrent, paye, description, annee, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          h.nom,
          newDate,
          h.type,
          h.recurrent,
          h.paye,
          isReligious
            ? (h.description || "") + " [Date à vérifier - jour religieux]"
            : h.description,
          toYear,
          session.user.id,
          now,
          now,
        ]
      );

      duplicated++;
      if (isReligious) skippedReligious++;
    }

    return NextResponse.json({
      message: `${duplicated} jours fériés dupliqués vers ${toYear}`,
      duplicated,
      religiousToVerify: skippedReligious,
    });
  } catch (error: any) {
    console.error("Erreur duplication jours fériés:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
