/**
 * Contract Detail API
 * Get, update, and sign individual contracts
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { contractService } from "@/lib/services/contract-service";

// Get contract by ID
export const GET = withAuth(async (req: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = await params;
    const contract = await contractService.getById(id);
    
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    
    // Users can only view their own contracts
    if (user.role === "USER" && contract.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }
    
    // Mark as viewed if this is the employee viewing
    if (contract.user_id === user.id && contract.status === "SENT") {
      await contractService.markAsViewed(id);
      contract.status = "VIEWED";
      contract.viewed_at = new Date();
    }
    
    return NextResponse.json(contract);
  } catch (error: any) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
});

// Update contract (send for signature, archive, etc.)
export const PATCH = withAuth(async (req: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = await params;
    console.log("🔵 PATCH /api/contracts/[id] - contractId:", id);
    
    const { action, signatureData } = await req.json();
    console.log("🔵 Action:", action, "User:", user.id, "Role:", user.role);
    
    const clientInfo = getClientInfo(req);
    
    const contract = await contractService.getById(id);
    console.log("🔵 Contract fetched:", contract ? `Found (status: ${contract.status})` : "Not found");
    
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    
    switch (action) {
      case "send":
        console.log("🔵 Processing 'send' action...");
        // Only RH/Admin can send contracts
        if (user.role === "USER") {
          console.log("❌ Access denied - user role is USER");
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
        console.log("✅ Access granted, calling sendForSignature...");
        try {
          const sentContract = await contractService.sendForSignature(id, user.id);
          console.log("✅ sendForSignature completed successfully");
          return NextResponse.json(sentContract);
        } catch (sendError: any) {
          console.error("❌❌❌ SEND ERROR:", sendError);
          console.error("❌ Send error message:", sendError.message);
          console.error("❌ Send error stack:", sendError.stack);
          throw sendError;
        }
      
      case "sign":
        // Only the contract owner can sign
        if (contract.user_id !== user.id) {
          return NextResponse.json(
            { error: "Only the contract recipient can sign" },
            { status: 403 }
          );
        }
        
        if (!signatureData) {
          return NextResponse.json(
            { error: "Signature data is required" },
            { status: 400 }
          );
        }
        
        const signedContract = await contractService.sign({
          contractId: id,
          signatureData,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
        return NextResponse.json(signedContract);
      
      case "archive":
        // Only RH/Admin can archive
        if (user.role === "USER") {
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
        await contractService.archive(id, user.id);
        return NextResponse.json({ success: true, status: "ARCHIVED" });
      
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("❌❌❌ PATCH ERROR:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to update contract" },
      { status: 500 }
    );
  }
});
