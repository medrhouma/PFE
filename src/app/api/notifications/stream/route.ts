import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      let timer: NodeJS.Timeout | null = null;

      const tick = async () => {
        try {
          const isAdmin = userRole === "RH" || userRole === "SUPER_ADMIN";
          const notifications: any = await query(
            isAdmin
              ? `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`
              : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
            isAdmin ? [] : [userId]
          );
          const unreadCountResult: any = await query(
            isAdmin
              ? `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`
              : `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
            isAdmin ? [] : [userId]
          );

          send({
            unreadCount: unreadCountResult?.[0]?.count || 0,
            notifications: notifications || [],
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          send({ error: "STREAM_ERROR", message: error.message });
        }
      };

      tick();
      timer = setInterval(tick, 5000);

      req.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
