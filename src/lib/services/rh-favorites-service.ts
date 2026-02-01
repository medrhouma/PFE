/**
 * RH Favorites Service
 * Allows RH to bookmark users, documents, contracts for quick access
 */

import { query, execute } from "@/lib/mysql-direct";

type FavoriteType = "USER" | "DOCUMENT" | "CONTRACT" | "LEAVE_REQUEST";

interface AddFavoriteParams {
  rhUserId: string;
  entityType: FavoriteType;
  entityId: string;
  notes?: string;
  priority?: number;
}

class RHFavoritesService {
  /**
   * Add a favorite
   */
  async add(params: AddFavoriteParams): Promise<any> {
    try {
      // Check if already favorited
      const existing = await query(
        `SELECT id FROM rh_favorites 
         WHERE rh_user_id = ? AND entity_type = ? AND entity_id = ?`,
        [params.rhUserId, params.entityType, params.entityId]
      ) as any[];
      
      if (existing.length > 0) {
        // Update notes/priority if already exists
        await execute(
          `UPDATE rh_favorites SET notes = ?, priority = ? WHERE id = ?`,
          [params.notes || null, params.priority || 0, existing[0].id]
        );
        return { id: existing[0].id, updated: true };
      }
      
      const id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await execute(
        `INSERT INTO rh_favorites (id, rh_user_id, entity_type, entity_id, notes, priority, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          params.rhUserId,
          params.entityType,
          params.entityId,
          params.notes || null,
          params.priority || 0
        ]
      );
      
      return { id, created: true };
    } catch (error) {
      console.error("Failed to add favorite:", error);
      throw error;
    }
  }

  /**
   * Remove a favorite
   */
  async remove(rhUserId: string, entityType: FavoriteType, entityId: string): Promise<boolean> {
    try {
      await execute(
        `DELETE FROM rh_favorites 
         WHERE rh_user_id = ? AND entity_type = ? AND entity_id = ?`,
        [rhUserId, entityType, entityId]
      );
      return true;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      throw error;
    }
  }

  /**
   * Check if entity is favorited
   */
  async isFavorited(rhUserId: string, entityType: FavoriteType, entityId: string): Promise<boolean> {
    const favorites = await query(
      `SELECT id FROM rh_favorites 
       WHERE rh_user_id = ? AND entity_type = ? AND entity_id = ?`,
      [rhUserId, entityType, entityId]
    ) as any[];
    
    return favorites.length > 0;
  }

  /**
   * Get all favorites for an RH user
   */
  async getFavorites(rhUserId: string, entityType?: FavoriteType): Promise<any[]> {
    let sql = `SELECT * FROM rh_favorites WHERE rh_user_id = ?`;
    const params: any[] = [rhUserId];
    
    if (entityType) {
      sql += ` AND entity_type = ?`;
      params.push(entityType);
    }
    
    sql += ` ORDER BY priority DESC, created_at DESC`;
    
    return await query(sql, params) as any[];
  }

  /**
   * Get favorite users with details
   */
  async getFavoriteUsers(rhUserId: string): Promise<any[]> {
    return await query(
      `SELECT f.*, u.id as userId, u.name, u.last_name, u.email, u.image, u.status,
              e.position, e.department, e.status as employeeStatus
       FROM rh_favorites f
       JOIN User u ON f.entity_id = u.id
       LEFT JOIN Employe e ON u.id = e.user_id
       WHERE f.rh_user_id = ? AND f.entity_type = 'USER'
       ORDER BY f.priority DESC, f.created_at DESC`,
      [rhUserId]
    ) as any[];
  }

  /**
   * Get favorite documents with details
   */
  async getFavoriteDocuments(rhUserId: string): Promise<any[]> {
    return await query(
      `SELECT f.*, d.id as docId, d.name, d.type, d.category, d.status, d.created_at as docCreatedAt,
              u.name as userName, u.email as userEmail
       FROM rh_favorites f
       JOIN documents d ON f.entity_id = d.id
       JOIN User u ON d.user_id = u.id
       WHERE f.rh_user_id = ? AND f.entity_type = 'DOCUMENT'
       ORDER BY f.priority DESC, f.created_at DESC`,
      [rhUserId]
    ) as any[];
  }

  /**
   * Get favorite contracts with details
   */
  async getFavoriteContracts(rhUserId: string): Promise<any[]> {
    return await query(
      `SELECT f.*, c.id as contractId, c.title, c.type, c.status, c.created_at as contractCreatedAt,
              u.name as userName, u.email as userEmail
       FROM rh_favorites f
       JOIN contracts c ON f.entity_id = c.id
       JOIN User u ON c.user_id = u.id
       WHERE f.rh_user_id = ? AND f.entity_type = 'CONTRACT'
       ORDER BY f.priority DESC, f.created_at DESC`,
      [rhUserId]
    ) as any[];
  }

  /**
   * Get favorite leave requests with details
   */
  async getFavoriteLeaveRequests(rhUserId: string): Promise<any[]> {
    return await query(
      `SELECT f.*, lr.id as leaveId, lr.type, lr.date_debut, lr.date_fin, lr.status,
              u.name as userName, u.email as userEmail
       FROM rh_favorites f
       JOIN demande_conge lr ON f.entity_id = lr.id
       JOIN User u ON lr.user_id = u.id
       WHERE f.rh_user_id = ? AND f.entity_type = 'LEAVE_REQUEST'
       ORDER BY f.priority DESC, f.created_at DESC`,
      [rhUserId]
    ) as any[];
  }

  /**
   * Update favorite notes
   */
  async updateNotes(favoriteId: string, notes: string): Promise<void> {
    await execute(
      `UPDATE rh_favorites SET notes = ? WHERE id = ?`,
      [notes, favoriteId]
    );
  }

  /**
   * Update favorite priority
   */
  async updatePriority(favoriteId: string, priority: number): Promise<void> {
    await execute(
      `UPDATE rh_favorites SET priority = ? WHERE id = ?`,
      [priority, favoriteId]
    );
  }

  /**
   * Get favorites count by type
   */
  async getFavoritesCount(rhUserId: string): Promise<any> {
    const counts = await query(
      `SELECT entity_type, COUNT(*) as count 
       FROM rh_favorites 
       WHERE rh_user_id = ?
       GROUP BY entity_type`,
      [rhUserId]
    ) as any[];
    
    const result: Record<string, number> = {
      USER: 0,
      DOCUMENT: 0,
      CONTRACT: 0,
      LEAVE_REQUEST: 0,
      total: 0
    };
    
    for (const row of counts) {
      result[row.entity_type] = row.count;
      result.total += row.count;
    }
    
    return result;
  }
}

export const rhFavoritesService = new RHFavoritesService();
