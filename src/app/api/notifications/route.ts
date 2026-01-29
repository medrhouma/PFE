/**
 * Notifications API
 * Manage user notifications with role-based filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { notificationService } from "@/lib/services/notification-service";
import { query } from "@/lib/mysql-direct";

// Get user notifications (filtered by role)
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    
    console.log(`📬 Fetching notifications for user ${user.id} (${user.role}), unreadOnly: ${unreadOnly}`);
    
    // Get user's role from database
    const users: any = await query(
      `SELECT role FROM User WHERE id = ? LIMIT 1`,
      [user.id]
    );
    const userRole = users?.[0]?.role || 'USER';
    
    // Get all notifications for the user
    const allNotifications = await notificationService.getUserNotifications(
      user.id,
      unreadOnly
    );
    
    // Filter notifications based on role
    // USER: Only their own notifications (profile, leave requests, pointages)
    // RH: RH-specific notifications + their own user notifications
    // SUPER_ADMIN: All notifications including system alerts
    const notifications = allNotifications.filter((notif: any) => {
      try {
        const metadata = notif.metadata ? JSON.parse(notif.metadata) : {};
        const targetRole = metadata.targetRole || 'USER';
        
        // USER can see notifications targeted to USER
        if (userRole === 'USER') {
          return targetRole === 'USER';
        }
        
        // RH can see RH and USER targeted notifications (their own profile/pointage notifications)
        if (userRole === 'RH') {
          return targetRole === 'RH' || (targetRole === 'USER' && notif.user_id === user.id);
        }
        
        // SUPER_ADMIN can see all notifications
        if (userRole === 'SUPER_ADMIN') {
          return true;
        }
        
        return true; // Fallback
      } catch (e) {
        // If parsing fails, show the notification
        return true;
      }
    });
    
    const unreadCount = await notificationService.getUnreadCount(user.id);
    
    console.log(`📊 Found ${notifications.length}/${allNotifications.length} notifications for role ${userRole}, ${unreadCount} unread`);
    
    return NextResponse.json({
      notifications,
      unreadCount,
      role: userRole
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
});

// Create notification (admin only)
export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { userId, type, title, message, metadata, priority } = await req.json();
      
      if (!userId || !type || !title || !message) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }
      
      const notification = await notificationService.create({
        userId,
        type,
        title,
        message,
        metadata,
        priority,
      });
      
      return NextResponse.json(notification);
    } catch (error: any) {
      console.error("Error creating notification:", error);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);

// Mark notification as read
export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    const { notificationId, markAllAsRead } = await req.json();
    
    if (markAllAsRead) {
      await notificationService.markAllAsRead(user.id);
      return NextResponse.json({ success: true, message: "All marked as read" });
    }
    
    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }
    
    const notification = await notificationService.markAsRead(notificationId);
    return NextResponse.json(notification);
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
});

// Delete notification
export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("id");
    
    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const notification = await notificationService.getById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of own notifications (admins can delete any)
    if (notification.user_id !== user.id && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: "Not authorized to delete this notification" },
        { status: 403 }
      );
    }
    
    await notificationService.delete(notificationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
});
