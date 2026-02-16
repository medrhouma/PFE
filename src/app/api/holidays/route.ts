export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { v4 as uuidv4 } from "uuid";

// GET - Récupérer les jours fériés (par année)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const annee = searchParams.get("annee") || new Date().getFullYear().toString();

    const holidays: any = await query(
      `SELECT * FROM jour_ferie WHERE annee = ? ORDER BY date ASC`,
      [parseInt(annee)]
    );

    const formatted = holidays.map((h: any) => ({
      id: h.id,
      nom: h.nom,
      date: h.date,
      type: h.type,
      recurrent: !!h.recurrent,
      paye: !!h.paye,
      description: h.description,
      annee: h.annee,
      createdBy: h.created_by,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Erreur récupération jours fériés:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer un jour férié
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier le rôle RH ou SUPER_ADMIN
    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { nom, date, type, recurrent, paye, description, annee } = body;

    if (!nom || !date || !type || annee === undefined) {
      return NextResponse.json(
        { error: "Champs requis manquants (nom, date, type, annee)" },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const now = new Date();

    await query(
      `INSERT INTO jour_ferie (id, nom, date, type, recurrent, paye, description, annee, created_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        nom,
        new Date(date),
        type,
        recurrent !== undefined ? recurrent : true,
        paye !== undefined ? paye : true,
        description || null,
        annee,
        session.user.id,
        now,
        now,
      ]
    );

    return NextResponse.json({ id, message: "Jour férié créé avec succès" }, { status: 201 });
  } catch (error: any) {
    console.error("Erreur création jour férié:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
