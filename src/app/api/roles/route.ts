import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic";

// Structure des permissions par défaut pour chaque rôle
const defaultPermissions = {
  USER: {
    profils: { ajouter: true, modifier: true, voir: true, supprimer: false },
    newsletter: { ajouter: false, modifier: false, voir: false, supprimer: false },
    traitement_daemon: { ajouter: false, supprimer: false },
    parametres: { ajouter: false, supprimer: false }
  },
  SUPER_ADMIN: {
    profils: { ajouter: true, modifier: true, voir: true, supprimer: true },
    newsletter: { ajouter: true, modifier: true, voir: true, supprimer: true },
    traitement_daemon: { ajouter: true, supprimer: true },
    parametres: { ajouter: true, supprimer: true }
  },
  RH: {
    profils: { ajouter: true, modifier: true, voir: true, supprimer: true },
    newsletter: { ajouter: true, modifier: true, voir: true, supprimer: false },
    traitement_daemon: { ajouter: false, supprimer: false },
    parametres: { ajouter: false, supprimer: false }
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Retourner les permissions par défaut (vous pouvez les stocker en DB plus tard)
    const roles = [
      {
        id: "USER",
        name: "User",
        description: "Utilisateur avec permissions configurables par module",
        permissions: defaultPermissions.USER
      },
      {
        id: "SUPER_ADMIN",
        name: "Super Admin",
        description: "Tous les accès",
        permissions: defaultPermissions.SUPER_ADMIN
      },
      {
        id: "RH",
        name: "RH",
        description: "Gestion des ressources humaines",
        permissions: defaultPermissions.RH
      }
    ]

    return NextResponse.json(roles)
  } catch (error) {
    console.error("Error fetching roles:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des rôles" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { roleId, permissions, description } = await request.json()

    // Ici vous pouvez sauvegarder dans une table de permissions
    // Pour l'instant, on simule juste la réponse
    console.log("Updating role:", roleId, "with permissions:", permissions)

    return NextResponse.json({ 
      success: true,
      message: "Rôle mis à jour avec succès" 
    })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du rôle" },
      { status: 500 }
    )
  }
}
