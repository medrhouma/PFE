import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/mysql-direct";

/**
 * POST /api/debug/fix-image-column
 * Alter User.image column to LONGTEXT to support base64 images
 * Only accessible by SUPER_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Alter User.image column to LONGTEXT
    await execute(`ALTER TABLE User MODIFY COLUMN image LONGTEXT`, []);

    // Also update Employe.photo to LONGTEXT if it's only TEXT
    await execute(`ALTER TABLE Employe MODIFY COLUMN photo LONGTEXT`, []);

    return NextResponse.json({
      success: true,
      message: "Columns modified successfully. User.image and Employe.photo are now LONGTEXT."
    });

  } catch (error: any) {
    console.error("Error modifying columns:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la modification" },
      { status: 500 }
    );
  }
}
