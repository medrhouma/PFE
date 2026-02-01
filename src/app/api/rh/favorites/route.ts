/**
 * RH Favorites API
 * Manage RH bookmarked items (users, documents, contracts)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { rhFavoritesService } from "@/lib/services/rh-favorites-service";

// Get all favorites for the current RH user
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const entityType = searchParams.get("type") as any;
      const detailed = searchParams.get("detailed") === "true";
      
      if (detailed) {
        // Get favorites with entity details
        const result: any = {
          users: await rhFavoritesService.getFavoriteUsers(user.id),
          documents: await rhFavoritesService.getFavoriteDocuments(user.id),
          contracts: await rhFavoritesService.getFavoriteContracts(user.id),
          leaveRequests: await rhFavoritesService.getFavoriteLeaveRequests(user.id)
        };
        
        // Filter by type if specified
        if (entityType) {
          const typeMap: Record<string, string> = {
            USER: "users",
            DOCUMENT: "documents",
            CONTRACT: "contracts",
            LEAVE_REQUEST: "leaveRequests"
          };
          const key = typeMap[entityType];
          return NextResponse.json({ [key]: result[key] });
        }
        
        return NextResponse.json(result);
      }
      
      // Get simple favorites list
      const favorites = await rhFavoritesService.getFavorites(user.id, entityType);
      const counts = await rhFavoritesService.getFavoritesCount(user.id);
      
      return NextResponse.json({ favorites, counts });
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
      return NextResponse.json(
        { error: "Failed to fetch favorites" },
        { status: 500 }
      );
    }
  },
  { roles: ["RH", "SUPER_ADMIN"] }
);

// Add a favorite
export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { entityType, entityId, notes, priority } = await req.json();
      
      if (!entityType || !entityId) {
        return NextResponse.json(
          { error: "entityType and entityId are required" },
          { status: 400 }
        );
      }
      
      const validTypes = ["USER", "DOCUMENT", "CONTRACT", "LEAVE_REQUEST"];
      if (!validTypes.includes(entityType)) {
        return NextResponse.json(
          { error: "Invalid entityType. Must be one of: " + validTypes.join(", ") },
          { status: 400 }
        );
      }
      
      const result = await rhFavoritesService.add({
        rhUserId: user.id,
        entityType,
        entityId,
        notes,
        priority
      });
      
      return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
      console.error("Error adding favorite:", error);
      return NextResponse.json(
        { error: "Failed to add favorite" },
        { status: 500 }
      );
    }
  },
  { roles: ["RH", "SUPER_ADMIN"] }
);

// Remove a favorite
export const DELETE = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const entityType = searchParams.get("entityType") as any;
      const entityId = searchParams.get("entityId");
      
      if (!entityType || !entityId) {
        return NextResponse.json(
          { error: "entityType and entityId are required" },
          { status: 400 }
        );
      }
      
      await rhFavoritesService.remove(user.id, entityType, entityId);
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Error removing favorite:", error);
      return NextResponse.json(
        { error: "Failed to remove favorite" },
        { status: 500 }
      );
    }
  },
  { roles: ["RH", "SUPER_ADMIN"] }
);
