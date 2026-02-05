/**
 * Contracts API
 * CRUD operations for employee contracts with signature workflow
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { contractService } from "@/lib/services/contract-service";

// Get contracts (filtered by role)
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;
    const type = searchParams.get("type") || undefined;
    const userId = searchParams.get("userId") || undefined;
    
    // USER can only see their own contracts
    if (user.role === "USER") {
      const contracts = await contractService.getUserContracts(user.id, status);
      return NextResponse.json({ success: true, data: contracts });
    }
    
    // RH and SUPER_ADMIN can see all contracts
    const contracts = await contractService.getAllContracts({
      status,
      type,
      userId
    });
    
    const stats = await contractService.getStats();
    
    return NextResponse.json({ success: true, data: contracts, stats });
  } catch (error: any) {
    console.error("Error fetching contracts:", error);
    
    // Handle missing table error gracefully
    if (error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({
        success: true,
        data: [],
        message: "La table contracts n'existe pas encore. Un administrateur doit exécuter les migrations via POST /api/debug/migrate"
      });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch contracts", details: error.message },
      { status: 500 }
    );
  }
});

// Create a new contract (RH/ADMIN only)
export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { userId, title, type, description, pdfPath, signatureZone, validFrom, validUntil } = await req.json();
      
      if (!userId || !title || !type || !pdfPath) {
        return NextResponse.json(
          { error: "Missing required fields: userId, title, type, pdfPath" },
          { status: 400 }
        );
      }
      
      const contract = await contractService.create({
        userId,
        title,
        type,
        description,
        pdfPath,
        signatureZone,
        createdBy: user.id,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined
      });
      
      return NextResponse.json(contract, { status: 201 });
    } catch (error: any) {
      console.error("Error creating contract:", error);
      return NextResponse.json(
        { error: "Failed to create contract" },
        { status: 500 }
      );
    }
  },
  { roles: ["RH", "SUPER_ADMIN"] }
);
