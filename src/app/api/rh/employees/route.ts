/**
 * RH Employees List API
 * Get all employees with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const search = searchParams.get("search");
      
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          { nom: { contains: search, mode: "insensitive" } },
          { prenom: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      
      const employees = await prisma.employe.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              roleEnum: true,
              status: true,
              createdAt: true,
            },
          },
          rhDecisions: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              decider: {
                select: {
                  name: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      
      return NextResponse.json(employees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      return NextResponse.json(
        { error: "Failed to fetch employees" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
