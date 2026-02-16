export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

// GET - Récupérer un jour férié par ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const holidays: any = await query(
      `SELECT * FROM jour_ferie WHERE id = ?`,
      [id]
    );

    if (!holidays || holidays.length === 0) {
      return NextResponse.json({ error: "Jour férié non trouvé" }, { status: 404 });
    }

    const h = holidays[0];
    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error("Erreur récupération jour férié:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Modifier un jour férié
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nom, date, type, recurrent, paye, description, annee } = body;

    // Vérifier que le jour férié existe
    const existing: any = await query(
      `SELECT id FROM jour_ferie WHERE id = ?`,
      [id]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Jour férié non trouvé" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (nom !== undefined) {
      updates.push("nom = ?");
      values.push(nom);
    }
    if (date !== undefined) {
      updates.push("date = ?");
      values.push(new Date(date));
    }
    if (type !== undefined) {
      updates.push("type = ?");
      values.push(type);
    }
    if (recurrent !== undefined) {
      updates.push("recurrent = ?");
      values.push(recurrent);
    }
    if (paye !== undefined) {
      updates.push("paye = ?");
      values.push(paye);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (annee !== undefined) {
      updates.push("annee = ?");
      values.push(annee);
    }

    updates.push("updated_at = ?");
    values.push(new Date());
    values.push(id);

    await query(
      `UPDATE jour_ferie SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: "Jour férié mis à jour avec succès" });
  } catch (error: any) {
    console.error("Erreur mise à jour jour férié:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Supprimer un jour férié
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;

    const existing: any = await query(
      `SELECT id FROM jour_ferie WHERE id = ?`,
      [id]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Jour férié non trouvé" }, { status: 404 });
    }

    await query(`DELETE FROM jour_ferie WHERE id = ?`, [id]);

    return NextResponse.json({ message: "Jour férié supprimé avec succès" });
  } catch (error: any) {
    console.error("Erreur suppression jour férié:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
