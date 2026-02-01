/**
 * Contract Service
 * Manages employee contracts with digital signature workflow
 */

import { query, execute } from "@/lib/mysql-direct";
import { auditLogger } from "./audit-logger";
import { notificationService } from "./notification-service";
import { emailService } from "./email-service";

type ContractStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "ARCHIVED" | "CANCELLED";

interface CreateContractParams {
  userId: string;
  title: string;
  type: "CDI" | "CDD" | "Stage" | "Freelance";
  description?: string;
  pdfPath: string;
  signatureZone?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdBy: string;
  validFrom?: Date;
  validUntil?: Date;
}

interface SignContractParams {
  contractId: string;
  signatureData: string; // Base64 image of signature
  ipAddress?: string;
  userAgent?: string;
}

class ContractService {
  /**
   * Create a new contract
   */
  async create(params: CreateContractParams): Promise<any> {
    try {
      const id = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await execute(
        `INSERT INTO contracts 
         (id, user_id, title, type, description, original_pdf_path, status, version, 
          signature_zone, created_by, valid_from, valid_until, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', 1, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id,
          params.userId,
          params.title,
          params.type,
          params.description || null,
          params.pdfPath,
          params.signatureZone ? JSON.stringify(params.signatureZone) : null,
          params.createdBy,
          params.validFrom || null,
          params.validUntil || null
        ]
      );
      
      // Log the action
      await auditLogger.log({
        userId: params.createdBy,
        action: "CONTRACT_CREATED",
        entityType: "Contract",
        entityId: id,
        metadata: {
          targetUserId: params.userId,
          title: params.title,
          type: params.type
        },
        severity: "INFO"
      });
      
      return { id, status: "DRAFT" };
    } catch (error) {
      console.error("Failed to create contract:", error);
      throw error;
    }
  }

  /**
   * Send contract to employee for signature
   */
  async sendForSignature(contractId: string, senderId: string): Promise<any> {
    try {
      console.log("🔵 Sending contract for signature:", contractId);
      
      // Get contract details
      const contracts = await query(
        `SELECT c.*, 
         u.email as userEmail, 
         COALESCE(u.name, CONCAT(u.prenom, ' ', u.nom)) as userName
         FROM contracts c
         JOIN User u ON c.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
         WHERE c.id = ?`,
        [contractId]
      ) as any[];
      
      if (!contracts[0]) {
        console.error("❌ Contract not found:", contractId);
        throw new Error("Contract not found");
      }
      
      const contract = contracts[0];
      console.log("📋 Contract found:", { id: contract.id, status: contract.status, userId: contract.user_id, userEmail: contract.userEmail });
      
      if (contract.status !== "DRAFT") {
        console.error("❌ Invalid status:", contract.status);
        throw new Error("Contract can only be sent when in DRAFT status");
      }
      
      // Update status to SENT
      console.log("📝 Updating contract status to SENT...");
      try {
        await execute(
          `UPDATE contracts SET status = 'SENT', sent_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [contractId]
        );
        console.log("✅ Status updated to SENT");
      } catch (updateError) {
        console.error("❌ Failed to update status:", updateError);
        throw updateError;
      }
      
      // Notify the employee
      console.log("🔔 Creating notification for user:", contract.user_id);
      try {
        await notificationService.create({
          userId: contract.user_id,
          type: "DOCUMENT_REQUIRED",
          title: "Nouveau contrat à signer",
          message: `Un nouveau contrat "${contract.title}" vous a été envoyé pour signature.`,
          priority: "HIGH",
          metadata: {
            contractId,
            contractTitle: contract.title
          }
        });
      } catch (notifError) {
        console.error("❌ Failed to create notification:", notifError);
        // Continue even if notification fails
      }
      
      // Send email to employee
      console.log("📧 Sending email to:", contract.userEmail);
      try {
        await emailService.sendContractNotificationEmail(
          contract.userEmail,
          contract.userName,
          contract.title,
          `${process.env.NEXTAUTH_URL}/documents/contracts/${contractId}`
        );
      } catch (emailError) {
        console.error("❌ Failed to send contract email:", emailError);
        // Continue even if email fails
      }
      
      // Log the action
      console.log("📊 Logging audit action...");
      try {
        await auditLogger.log({
          userId: senderId,
          action: "CONTRACT_SENT",
          entityType: "Contract",
          entityId: contractId,
          metadata: {
            targetUserId: contract.user_id,
            title: contract.title
          },
          severity: "INFO"
        });
      } catch (auditError) {
        console.error("❌ Failed to log audit:", auditError);
        // Continue even if audit fails
      }
      
      console.log("✅ Contract sent successfully");
      return { id: contractId, status: "SENT" };
    } catch (error) {
      console.error("❌ Failed to send contract:", error);
      throw error;
    }
  }

  /**
   * Mark contract as viewed
   */
  async markAsViewed(contractId: string): Promise<void> {
    const contracts = await query(
      `SELECT * FROM contracts WHERE id = ?`,
      [contractId]
    ) as any[];
    
    if (!contracts[0]) {
      throw new Error("Contract not found");
    }
    
    // Only update if currently SENT
    if (contracts[0].status === "SENT") {
      await execute(
        `UPDATE contracts SET status = 'VIEWED', viewed_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [contractId]
      );
    }
  }

  /**
   * Sign a contract
   */
  async sign(params: SignContractParams): Promise<any> {
    try {
      // Get contract details
      const contracts = await query(
        `SELECT c.*, u.id as userId, u.email as userEmail, u.name as userName
         FROM contracts c
         JOIN User u ON c.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
         WHERE c.id = ?`,
        [params.contractId]
      ) as any[];
      
      if (!contracts[0]) {
        throw new Error("Contract not found");
      }
      
      const contract = contracts[0];
      
      if (contract.status !== "SENT" && contract.status !== "VIEWED") {
        throw new Error("Contract can only be signed when SENT or VIEWED");
      }
      
      // TODO: In production, merge signature into PDF
      // For now, store signature data and create signed PDF path
      const signedPdfPath = contract.original_pdf_path.replace(".pdf", "_signed.pdf");
      
      // Update contract with signature
      await execute(
        `UPDATE contracts 
         SET status = 'SIGNED', 
             signature_data = ?,
             signed_pdf_path = ?,
             signed_at = NOW(),
             signed_ip_address = ?,
             signed_user_agent = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          params.signatureData,
          signedPdfPath,
          params.ipAddress || null,
          params.userAgent || null,
          params.contractId
        ]
      );
      
      // Notify RH of signature
      const rhUsers = await notificationService.getRHUsers();
      for (const rhUserId of rhUsers) {
        await notificationService.create({
          userId: rhUserId,
          type: "RH_ACTION_REQUIRED",
          title: "Contrat signé",
          message: `${contract.userName} a signé le contrat "${contract.title}".`,
          priority: "NORMAL",
          targetRole: "RH",
          metadata: {
            contractId: params.contractId,
            signedBy: contract.userId
          }
        });
      }
      
      // Send confirmation email to employee
      try {
        await emailService.sendContractSignedConfirmation(
          contract.userEmail,
          contract.userName,
          contract.title
        );
      } catch (emailError) {
        console.error("Failed to send contract signed email:", emailError);
      }
      
      // Log the action
      await auditLogger.log({
        userId: contract.userId,
        action: "CONTRACT_SIGNED",
        entityType: "Contract",
        entityId: params.contractId,
        metadata: {
          title: contract.title,
          signedAt: new Date().toISOString(),
          ipAddress: params.ipAddress
        },
        severity: "INFO"
      });
      
      return { id: params.contractId, status: "SIGNED", signedAt: new Date() };
    } catch (error) {
      console.error("Failed to sign contract:", error);
      throw error;
    }
  }

  /**
   * Archive a signed contract
   */
  async archive(contractId: string, archivedBy: string): Promise<void> {
    const contracts = await query(
      `SELECT * FROM contracts WHERE id = ?`,
      [contractId]
    ) as any[];
    
    if (!contracts[0]) {
      throw new Error("Contract not found");
    }
    
    if (contracts[0].status !== "SIGNED") {
      throw new Error("Only signed contracts can be archived");
    }
    
    await execute(
      `UPDATE contracts SET status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [contractId]
    );
    
    await auditLogger.log({
      userId: archivedBy,
      action: "CONTRACT_ARCHIVED",
      entityType: "Contract",
      entityId: contractId,
      severity: "INFO"
    });
  }

  /**
   * Get contract by ID
   */
  async getById(contractId: string): Promise<any> {
    const contracts = await query(
      `SELECT c.*, 
              u.name as userName, u.email as userEmail,
              creator.name as creatorName
       FROM contracts c
       JOIN User u ON c.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
       LEFT JOIN User creator ON c.created_by COLLATE utf8mb4_unicode_ci = creator.id COLLATE utf8mb4_unicode_ci
       WHERE c.id = ?`,
      [contractId]
    ) as any[];
    
    return contracts[0] || null;
  }

  /**
   * Get contracts for a user
   */
  async getUserContracts(userId: string, status?: ContractStatus): Promise<any[]> {
    let sql = `SELECT * FROM contracts WHERE user_id = ?`;
    const params: any[] = [userId];
    
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    return await query(sql, params) as any[];
  }

  /**
   * Get all contracts (for RH/Admin)
   */
  async getAllContracts(filters?: {
    status?: ContractStatus;
    type?: string;
    userId?: string;
  }): Promise<any[]> {
    let sql = `SELECT c.*, u.name as userName, u.email as userEmail
               FROM contracts c
               JOIN User u ON c.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
               WHERE 1=1`;
    const params: any[] = [];
    
    if (filters?.status) {
      sql += ` AND c.status = ?`;
      params.push(filters.status);
    }
    if (filters?.type) {
      sql += ` AND c.type = ?`;
      params.push(filters.type);
    }
    if (filters?.userId) {
      sql += ` AND c.user_id = ?`;
      params.push(filters.userId);
    }
    
    sql += ` ORDER BY c.created_at DESC`;
    
    return await query(sql, params) as any[];
  }

  /**
   * Get contract statistics
   */
  async getStats(): Promise<any> {
    const stats = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft,
         SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status = 'VIEWED' THEN 1 ELSE 0 END) as viewed,
         SUM(CASE WHEN status = 'SIGNED' THEN 1 ELSE 0 END) as signed,
         SUM(CASE WHEN status = 'ARCHIVED' THEN 1 ELSE 0 END) as archived
       FROM contracts`
    ) as any[];
    
    return stats[0] || { total: 0, draft: 0, sent: 0, viewed: 0, signed: 0, archived: 0 };
  }

  /**
   * Create a new version of a contract
   */
  async createVersion(contractId: string, newPdfPath: string, createdBy: string): Promise<any> {
    const original = await this.getById(contractId);
    if (!original) {
      throw new Error("Original contract not found");
    }
    
    // Cancel the original
    await execute(
      `UPDATE contracts SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`,
      [contractId]
    );
    
    // Create new version
    const newContract = await this.create({
      userId: original.user_id,
      title: original.title,
      type: original.type,
      description: original.description,
      pdfPath: newPdfPath,
      signatureZone: original.signature_zone ? JSON.parse(original.signature_zone) : undefined,
      createdBy,
      validFrom: original.valid_from,
      validUntil: original.valid_until
    });
    
    // Update parent reference and version
    await execute(
      `UPDATE contracts SET parent_id = ?, version = ? WHERE id = ?`,
      [contractId, original.version + 1, newContract.id]
    );
    
    return newContract;
  }
}

export const contractService = new ContractService();
