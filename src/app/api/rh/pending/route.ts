/**
 * RH Pending Employees API
 * Get all employees waiting for validation
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const employees = await prisma.employe.findMany({
        where: { status: "EN_ATTENTE" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              roleEnum: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      
      return NextResponse.json(employees);
    } catch (error: any) {
      console.error("Error fetching pending employees:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending employees" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
