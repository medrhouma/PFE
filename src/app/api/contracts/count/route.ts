/**
 * Contracts Count API
 * Get count of pending contracts for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { contractService } from "@/lib/services/contract-service";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const contracts = await contractService.getUserContracts(user.id);
    const pendingCount = contracts.filter((c: any) => 
      c.status === "SENT" || c.status === "VIEWED"
    ).length;
    
    return NextResponse.json({ count: pendingCount });
  } catch (error: any) {
    console.error("Error fetching contract count:", error);
    return NextResponse.json({ count: 0 });
  }
});
