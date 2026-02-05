/**
 * Notification Service
 * Manages user notifications with role-based access control
 */

import { query } from "@/lib/mysql-direct";
import { emailService } from "@/lib/services/email-service";
import { pushService } from "@/lib/services/push-service";

// Define types locally instead of importing from @prisma/client
type NotificationType = 
  | "PROFILE_APPROVED" 
  | "PROFILE_REJECTED" 
  | "PROFILE_SUBMITTED"
  | "LEAVE_REQUEST"
  | "POINTAGE_SUCCESS"
  | "POINTAGE_ANOMALY"
  | "RH_ACTION_REQUIRED"
  | "SYSTEM_ALERT"
  | "DOCUMENT_REQUIRED"
  | "GENERAL";

type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
  priority?: NotificationPriority;
  targetRole?: 'USER' | 'RH' | 'SUPER_ADMIN'; // Role that should receive this notification
}

/**
 * Notification types by role:
 * 
 * USER:
 * - PROFILE_APPROVED, PROFILE_REJECTED, PROFILE_SUBMITTED
 * - LEAVE_REQUEST (their own requests status updates)
 * - POINTAGE_SUCCESS, POINTAGE_ANOMALY (their own pointages)
 * 
 * RH:
 * - RH_ACTION_REQUIRED (profiles, leave requests needing approval)
 * - LEAVE_REQUEST (all user requests)
 * - POINTAGE_ANOMALY (all users anomalies)
 * - POINTAGE_SUCCESS (optional: all users pointages)
 * 
 * ADMIN:
 * - SYSTEM_ALERT
 * - All RH notifications
 * - Critical system events
 */

class NotificationService {
  /**
   * Get all RH users
   */
  async getRHUsers(): Promise<string[]> {
    try {
      const users = await query(
        `SELECT id FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE'`
      ) as any[];
      return users.map(u => u.id);
    } catch (error) {
      console.error("❌ Failed to get RH users:", error);
      return [];
    }
  }

  /**
   * Get all Admin users
   */
  async getAdminUsers(): Promise<string[]> {
    try {
      const users = await query(
        `SELECT id FROM User WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'`
      ) as any[];
      return users.map(u => u.id);
    } catch (error) {
      console.error("❌ Failed to get admin users:", error);
      return [];
    }
  }
  /**
   * Create a notification for a user
   */
  async create(params: CreateNotificationParams) {
    try {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadataObj = {
        ...(params.metadata || {}),
        targetRole: params.targetRole || 'USER'
      };
      const metadata = JSON.stringify(metadataObj);
      const priority = params.priority || "NORMAL";
      
      console.log(`📬 Creating notification for user ${params.userId}:`, {
        id,
        type: params.type,
        title: params.title,
        priority,
        targetRole: params.targetRole
      });
      
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, metadata, priority, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [id, params.userId, params.type, params.title, params.message, metadata, priority]
      );

      const notification = {
        id,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        priority,
        isRead: false,
        createdAt: new Date(),
        metadata: metadataObj
      };

      // ✅ Send real-time notification via SSE
      try {
        // Dynamic import to avoid circular dependencies
        const realtimeModule = await import("@/app/api/notifications/realtime/route");
        if (realtimeModule.sendNotificationToUser) {
          const sent = realtimeModule.sendNotificationToUser(params.userId, notification);
          if (sent) {
            console.log(`✅ Real-time notification sent to user ${params.userId}`);
          }
        }
      } catch (realtimeError) {
        console.error("❌ Failed to send real-time notification:", realtimeError);
        // Continue even if real-time fails
      }

      // Check user preferences for email and push notifications
      let userPreferences = { emailNotifications: true, pushNotifications: true };
      try {
        const prefs: any[] = await query(
          `SELECT emailNotifications, pushNotifications FROM UserPreferences WHERE userId = ? LIMIT 1`,
          [params.userId]
        );
        if (prefs?.[0]) {
          userPreferences = {
            emailNotifications: prefs[0].emailNotifications === 1 || prefs[0].emailNotifications === true,
            pushNotifications: prefs[0].pushNotifications === 1 || prefs[0].pushNotifications === true
          };
        }
      } catch (prefError) {
        console.log("Could not fetch user preferences, using defaults:", prefError);
      }

      // Send email notification based on priority and user preferences
      if (userPreferences.emailNotifications && (priority === "URGENT" || priority === "HIGH")) {
        try {
          const users: any = await query(
            `SELECT email, role FROM User WHERE id = ? LIMIT 1`,
            [params.userId]
          );

          const user = users?.[0];
          if (user?.email) {
            await emailService.sendUrgentNotificationEmail(user.email, params.title, params.message);
            console.log(`📧 Email notification sent to ${user.email}`);
          }
        } catch (emailError) {
          console.error("❌ Failed to send email notification:", emailError);
        }
      }

      // Send push notification based on user preferences
      if (userPreferences.pushNotifications) {
        try {
          await pushService.sendToUser(params.userId, {
            title: params.title,
            body: params.message,
            url: "/notifications"
          });
          console.log(`📱 Push notification sent to user ${params.userId}`);
        } catch (pushError) {
          console.error("❌ Failed to send push notification:", pushError);
        }
      }
      
      console.log(`✅ Notification created successfully:`, id);
      
      return notification;
    } catch (error) {
      console.error("❌ Failed to create notification:", error);
      throw error;
    }
  }

  /**
   * Notify user of profile approval (USER only)
   */
  async notifyProfileApproved(userId: string, approverName: string) {
    return await this.create({
      userId,
      type: "PROFILE_APPROVED",
      title: "Profil approuvé",
      message: `Votre profil a été approuvé par ${approverName}. Vous pouvez maintenant accéder à toutes les fonctionnalités.`,
      priority: "HIGH",
      targetRole: 'USER'
    });
  }

  /**
   * Notify user of profile rejection (USER only)
   */
  async notifyProfileRejected(userId: string, reason: string) {
    return await this.create({
      userId,
      type: "PROFILE_REJECTED",
      title: "Profil rejeté",
      message: `Votre profil a été rejeté. Raison: ${reason}. Veuillez modifier votre profil et le soumettre à nouveau.`,
      priority: "HIGH",
      targetRole: 'USER'
    });
  }

  /**
   * Notify RH of new pending employee (RH only)
   */
  async notifyRHNewPending(rhUserIds: string[], employeeName: string) {
    const notifications = rhUserIds.map((userId) =>
      this.create({
        userId,
        type: "RH_ACTION_REQUIRED",
        title: "Nouveau profil en attente",
        message: `Un nouveau profil employé nécessite votre validation: ${employeeName}`,
        priority: "NORMAL",
        targetRole: 'RH'
      })
    );
    
    return await Promise.all(notifications);
  }

  /**
   * Notify user of pointage anomaly (USER only)
   */
  async notifyPointageAnomaly(userId: string, anomalyType: string, description: string) {
    return await this.create({
      userId,
      type: "POINTAGE_ANOMALY",
      title: "Anomalie de pointage détectée",
      message: `Une anomalie a été détectée: ${description}`,
      metadata: { anomalyType },
      priority: "HIGH",
      targetRole: 'USER'
    });
  }

  /**
   * Notify user of successful pointage (USER only)
   */
  async notifyPointageSuccess(userId: string, pointageType: string) {
    return await this.create({
      userId,
      type: "POINTAGE_SUCCESS",
      title: "Pointage enregistré",
      message: `Votre ${pointageType} a été enregistré avec succès`,
      metadata: { pointageType },
      priority: "NORMAL",
      targetRole: 'USER'
    });
  }

  /**
   * Notify RH when user submits profile (RH only)
   */
  async notifyRHProfileSubmitted(rhUserIds: string[], employeeName: string, userId: string) {
    const notifications = rhUserIds.map((rhId) =>
      this.create({
        userId: rhId,
        type: "RH_ACTION_REQUIRED",
        title: "Nouveau profil soumis",
        message: `${employeeName} a soumis son profil pour validation`,
        metadata: { employeeUserId: userId, employeeName },
        priority: "HIGH",
        targetRole: 'RH'
      })
    );
    
    return await Promise.all(notifications);
  }

  /**
   * Notify user that profile was submitted (USER only)
   */
  async notifyUserProfileSubmitted(userId: string) {
    return await this.create({
      userId,
      type: "PROFILE_SUBMITTED",
      title: "Profil soumis",
      message: "Votre profil a été soumis avec succès et est en attente de validation par le service RH",
      priority: "NORMAL",
      targetRole: 'USER'
    });
  }

  /**
   * Notify admin of important system events (ADMIN only)
   */
  async notifyAdminSystemEvent(adminUserIds: string[], title: string, message: string, priority: NotificationPriority = "NORMAL") {
    const notifications = adminUserIds.map((adminId) =>
      this.create({
        userId: adminId,
        type: "SYSTEM_ALERT",
        title,
        message,
        priority,
        targetRole: 'SUPER_ADMIN'
      })
    );
    
    return await Promise.all(notifications);
  }

  /**
   * Notify RH when user submits leave request (RH only)
   */
  async notifyRHLeaveRequest(
    rhUserIds: string[],
    userName: string,
    leaveType: string,
    duration: number,
    startDate: string,
    requestId?: string
  ) {
    console.log(`🔔 notifyRHLeaveRequest called with:`, {
      rhUserIds,
      userName,
      leaveType,
      duration,
      startDate
    });

    const notifications = rhUserIds.map((rhId) => {
      console.log(`  → Creating notification for RH user: ${rhId}`);
      return this.create({
        userId: rhId,
        type: "LEAVE_REQUEST",
        title: "Nouvelle demande de congé",
        message: `${userName} a demandé ${duration} jour(s) de congé (${leaveType}) à partir du ${startDate}`,
        priority: "NORMAL",
        metadata: { userName, leaveType, duration, startDate, requestId },
        targetRole: 'RH'
      });
    });
    
    const results = await Promise.all(notifications);
    console.log(`✅ Created ${results.length} RH notifications`);
    return results;
  }

  /**
   * Notify user when leave request is approved (USER only)
   */
  async notifyLeaveRequestApproved(userId: string, leaveType: string, startDate: string, endDate: string) {
    return await this.create({
      userId,
      type: "LEAVE_REQUEST",
      title: "Demande de congé approuvée",
      message: `Votre demande de congé (${leaveType}) du ${startDate} au ${endDate} a été approuvée`,
      priority: "HIGH",
      targetRole: 'USER'
    });
  }

  /**
   * Notify user when leave request is rejected (USER only)
   */
  async notifyLeaveRequestRejected(userId: string, leaveType: string, reason?: string) {
    return await this.create({
      userId,
      type: "LEAVE_REQUEST",
      title: "Demande de congé rejetée",
      message: `Votre demande de congé (${leaveType}) a été rejetée${reason ? `. Raison: ${reason}` : ''}`,
      priority: "HIGH",
      targetRole: 'USER'
    });
  }

  /**
   * Notify user when leave request is submitted (USER only)
   */
  async notifyUserLeaveRequestSubmitted(userId: string, leaveType: string, duration: number) {
    return await this.create({
      userId,
      type: "LEAVE_REQUEST",
      title: "Demande de congé soumise",
      message: `Votre demande de ${duration} jour(s) de congé (${leaveType}) a été soumise avec succès et est en attente de validation`,
      priority: "NORMAL",
      targetRole: 'USER'
    });
  }

  /**
   * Notify RH when pointage anomaly is detected (RH only)
   */
  async notifyRHPointageAnomaly(rhUserIds: string[], userName: string, anomalyType: string, description: string) {
    console.log(`🚨 notifyRHPointageAnomaly called with:`, {
      rhUserIds,
      userName,
      anomalyType,
      description
    });

    const notifications = rhUserIds.map((rhId) => {
      console.log(`  → Creating anomaly notification for RH user: ${rhId}`);
      return this.create({
        userId: rhId,
        type: "POINTAGE_ANOMALY",
        title: "Anomalie de pointage détectée",
        message: `Anomalie détectée pour ${userName}: ${description}`,
        priority: "HIGH",
        metadata: { userName, anomalyType, description },
        targetRole: 'RH'
      });
    });
    
    const results = await Promise.all(notifications);
    console.log(`✅ Created ${results.length} anomaly notifications for RH`);
    return results;
  }

  /**
   * Notify RH and Super Admins when a pointage is successful (RH only - Optional)
   * Note: This generates many notifications. Consider disabling for normal pointages.
   */
  async notifyRHPointageSuccess(rhUserIds: string[], userName: string, pointageType: string, timestamp: string) {
    // Optional: Uncomment to disable routine pointage notifications for RH
    // console.log('📝 Skipping routine pointage notification for RH');
    // return [];
    
    const notifications = rhUserIds.map((rhId) =>
      this.create({
        userId: rhId,
        type: "POINTAGE_SUCCESS",
        title: "Pointage enregistré",
        message: `${userName} a effectué un ${pointageType} à ${timestamp}`,
        priority: "NORMAL",
        metadata: { userName, pointageType, timestamp },
        targetRole: 'RH'
      })
    );

    return await Promise.all(notifications);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, unreadOnly = false) {
    const sql = unreadOnly 
      ? `SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 50`
      : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`;
    
    const notifications: any = await query(sql, [userId]);
    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    await query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?`,
      [notificationId]
    );
    return { success: true };
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      await query(
        `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
      return { success: true };
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      // Return success anyway to not break UI
      return { success: true, error: error.message };
    }
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string) {
    await query(`DELETE FROM notifications WHERE id = ?`, [notificationId]);
    return { success: true };
  }

  /**
   * Get notification by ID
   */
  async getById(notificationId: string) {
    const notifications: any = await query(
      `SELECT * FROM notifications WHERE id = ? LIMIT 1`,
      [notificationId]
    );
    return notifications?.[0] || null;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    const result: any = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return result[0]?.count || 0;
  }
}

export const notificationService = new NotificationService();
