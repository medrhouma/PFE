/**
 * Real-Time Notification System (Server-Sent Events)
 * GET /api/notifications/realtime
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Keep track of active connections
const connections = new Map<string, ReadableStreamDefaultController>();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      connections.set(userId, controller);

      // Send initial connection message
      const data = JSON.stringify({
        type: "connected",
        message: "Real-time notifications connected",
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(`data: ${data}\n\n`);

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        connections.delete(userId);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
    cancel() {
      connections.delete(userId);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

/**
 * Send notification to a specific user in real-time
 */
export function sendNotificationToUser(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    createdAt: Date;
    metadata?: any;
  }
) {
  const controller = connections.get(userId);
  
  if (controller) {
    try {
      const data = JSON.stringify({
        type: "notification",
        notification: {
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        },
      });
      controller.enqueue(`data: ${data}\n\n`);
      return true;
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      connections.delete(userId);
      return false;
    }
  }
  
  return false;
}

/**
 * Send system event to all connected users
 */
export function broadcastSystemEvent(event: {
  type: string;
  message: string;
  severity: string;
}) {
  connections.forEach((controller, userId) => {
    try {
      const data = JSON.stringify({
        type: "system_event",
        event: {
          ...event,
          timestamp: new Date().toISOString(),
        },
      });
      controller.enqueue(`data: ${data}\n\n`);
    } catch (error) {
      console.error(`Failed to broadcast to user ${userId}:`, error);
      connections.delete(userId);
    }
  });
}

/**
 * Get number of active connections
 */
export function getActiveConnections(): number {
  return connections.size;
}

/**
 * Check if user is connected
 */
export function isUserConnected(userId: string): boolean {
  return connections.has(userId);
}
