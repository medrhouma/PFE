/**
 * Notification Service
 * Manages user notifications
 */

import { query } from "@/lib/mysql-direct";
import { emailService } from "@/lib/services/email-service";
import { pushService } from "@/lib/services/push-service";
import { NotificationType, NotificationPriority } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
  priority?: NotificationPriority;
}

class NotificationService {
  /**
   * Create a notification for a user
   */
  async create(params: CreateNotificationParams) {
    try {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadata = params.metadata ? JSON.stringify(params.metadata) : null;
      const priority = params.priority || "NORMAL";
      
      console.log(`📬 Creating notification for user ${params.userId}:`, {
        id,
        type: params.type,
        title: params.title,
        priority
      });
      
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, metadata, priority, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [id, params.userId, params.type, params.title, params.message, metadata, priority]
      );

      // Send urgent email to RH/SUPER_ADMIN when priority is URGENT
      if (priority === "URGENT") {
        try {
          const users: any = await query(
            `SELECT email, role FROM User WHERE id = ? LIMIT 1`,
            [params.userId]
          );

          const user = users?.[0];
          if (user?.email && (user.role === "RH" || user.role === "SUPER_ADMIN")) {
            await emailService.sendUrgentNotificationEmail(user.email, params.title, params.message);
          }

          await pushService.sendToUser(params.userId, {
            title: params.title,
            body: params.message,
            url: "/rh/notifications"
          });
        } catch (emailError) {
          console.error("❌ Failed to send urgent email:", emailError);
        }
      }
      
      console.log(`✅ Notification created successfully:`, id);
      
      return { id, ...params, isRead: false, createdAt: new Date(), updatedAt: new Date() };
    } catch (error) {
      console.error("❌ Failed to create notification:", error);
      throw error;
    }
  }

  /**
   * Notify user of profile approval
   */
  async notifyProfileApproved(userId: string, approverName: string) {
    return await this.create({
      userId,
      type: "PROFILE_APPROVED",
      title: "Profil approuvé",
      message: `Votre profil a été approuvé par ${approverName}. Vous pouvez maintenant accéder à toutes les fonctionnalités.`,
      priority: "HIGH",
    });
  }

  /**
   * Notify user of profile rejection
   */
  async notifyProfileRejected(userId: string, reason: string) {
    return await this.create({
      userId,
      type: "PROFILE_REJECTED",
      title: "Profil rejeté",
      message: `Votre profil a été rejeté. Raison: ${reason}. Veuillez modifier votre profil et le soumettre à nouveau.`,
      priority: "HIGH",
    });
  }

  /**
   * Notify RH of new pending employee
   */
  async notifyRHNewPending(rhUserIds: string[], employeeName: string) {
    const notifications = rhUserIds.map((userId) =>
      this.create({
        userId,
        type: "RH_ACTION_REQUIRED",
        title: "Nouveau profil en attente",
        message: `Un nouveau profil employé nécessite votre validation: ${employeeName}`,
        priority: "NORMAL",
      })
    );
    
    return await Promise.all(notifications);
  }

  /**
   * Notify user of pointage anomaly
   */
  async notifyPointageAnomaly(userId: string, anomalyType: string, description: string) {
    return await this.create({
      userId,
      type: "POINTAGE_ANOMALY",
      title: "Anomalie de pointage détectée",
      message: `Une anomalie a été détectée: ${description}`,
      metadata: { anomalyType },
      priority: "HIGH",
    });
  }

  /**
   * Notify user of successful pointage
   */
  async notifyPointageSuccess(userId: string, pointageType: string) {
    return await this.create({
      userId,
      type: "POINTAGE_SUCCESS",
      title: "Pointage enregistré",
      message: `Votre ${pointageType} a été enregistré avec succès`,
      metadata: { pointageType },
      priority: "NORMAL",
    });
  }

  /**
   * Notify RH when user submits profile
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
      })
    );
    
    return await Promise.all(notifications);
  }

  /**
   * Notify user that profile was submitted
   */
  async notifyUserProfileSubmitted(userId: string) {
    return await this.create({
      userId,
      type: "PROFILE_SUBMITTED",
      title: "Profil soumis",
      message: "Votre profil a été soumis avec succès et est en attente de validation par le service RH",
      priority: "NORMAL",
    });
  }

  /**
   * Notify admin of important system events
   */
  async notifyAdminSystemEvent(adminUserIds: string[], title: string, message: string, priority: NotificationPriority = "NORMAL") {
    const notifications = adminUserIds.map((adminId) =>
      this.create({
        userId: adminId,
        type: "SYSTEM_ALERT",
        title,
        message,
        priority,
      })
    );
    
    return await Promise.all(notifications);
  }

  /**
   * Notify RH when user submits leave request
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
        metadata: { userName, leaveType, duration, startDate, requestId }
      });
    });
    
    const results = await Promise.all(notifications);
    console.log(`✅ Created ${results.length} RH notifications`);
    return results;
  }

  /**
   * Notify user when leave request is approved
   */
  async notifyLeaveRequestApproved(userId: string, leaveType: string, startDate: string, endDate: string) {
    return await this.create({
      userId,
      type: "LEAVE_REQUEST",
      title: "Demande de congé approuvée",
      message: `Votre demande de congé (${leaveType}) du ${startDate} au ${endDate} a été approuvée`,
      priority: "HIGH",
    });
  }

  /**
   * Notify user when leave request is rejected
   */
  async notifyLeaveRequestRejected(userId: string, leaveType: string, reason?: string) {
    return await this.create({
      userId,
      type: "LEAVE_REQUEST",
      title: "Demande de congé rejetée",
      message: `Votre demande de congé (${leaveType}) a été rejetée${reason ? `. Raison: ${reason}` : ''}`,
      priority: "HIGH",
    });
  }

  /**
   * Notify user when leave request is submitted
   */
  async notifyUserLeaveRequestSubmitted(userId: string, leaveType: string, duration: number) {
    return await this.create({
      userId,
      type: "LEAVE_REQUEST",
      title: "Demande de congé soumise",
      message: `Votre demande de ${duration} jour(s) de congé (${leaveType}) a été soumise avec succès et est en attente de validation`,
      priority: "NORMAL",
    });
  }

  /**
   * Notify RH when pointage anomaly is detected
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
        metadata: { userName, anomalyType, description }
      });
    });
    
    const results = await Promise.all(notifications);
    console.log(`✅ Created ${results.length} anomaly notifications for RH`);
    return results;
  }

  /**
   * Notify RH and Super Admins when a pointage is successful
   */
  async notifyRHPointageSuccess(rhUserIds: string[], userName: string, pointageType: string, timestamp: string) {
    const notifications = rhUserIds.map((rhId) =>
      this.create({
        userId: rhId,
        type: "POINTAGE_SUCCESS",
        title: "Pointage enregistré",
        message: `${userName} a effectué un ${pointageType} à ${timestamp}`,
        priority: "NORMAL",
        metadata: { userName, pointageType, timestamp }
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
      `UPDATE notifications SET is_read = 1, read_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [notificationId]
    );
    return { success: true };
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    await query(
      `UPDATE notifications SET is_read = 1, read_at = NOW(), updated_at = NOW() WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return { success: true };
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string) {
    await query(`DELETE FROM notifications WHERE id = ?`, [notificationId]);
    return { success: true };
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
