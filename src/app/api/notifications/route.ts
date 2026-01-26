/**
 * Notifications API
 * Manage user notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { notificationService } from "@/lib/services/notification-service";

// Get user notifications
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    
    console.log(`📬 Fetching notifications for user ${user.id}, unreadOnly: ${unreadOnly}`);
    
    const notifications = await notificationService.getUserNotifications(
      user.id,
      unreadOnly
    );
    
    const unreadCount = await notificationService.getUnreadCount(user.id);
    
    console.log(`📊 Found ${notifications.length} notifications, ${unreadCount} unread`);
    
    return NextResponse.json({
      notifications,
      unreadCount,
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
