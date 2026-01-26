import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/mysql-direct";
import { emailService } from "@/lib/services/email-service";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-digest-secret");
    const expected = process.env.NOTIFICATION_DIGEST_SECRET;

    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rhUsers: any = await query(
      `SELECT email, name FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE' AND email IS NOT NULL`
    );

    const pending: any = await query(
      `SELECT type, priority, COUNT(*) as count
       FROM notifications
       WHERE is_read = 0
       GROUP BY type, priority
       ORDER BY priority DESC`
    );

    const totalUnread: any = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`
    );

    const summaryRows = (pending || [])
      .map((row: any) => `<li><strong>${row.type}</strong> (${row.priority}): ${row.count}</li>`)
      .join("");

    const summaryHtml = `
      <p><strong>Total non lues:</strong> ${totalUnread?.[0]?.count || 0}</p>
      <ul>${summaryRows || "<li>Aucune notification en attente</li>"}</ul>
    `;

    const summaryText = `Total non lues: ${totalUnread?.[0]?.count || 0}\n` +
      (pending || []).map((row: any) => `${row.type} (${row.priority}): ${row.count}`).join("\n");

    for (const rh of rhUsers || []) {
      await emailService.sendDailyDigestEmail(
        rh.email,
        summaryHtml,
        summaryText || "Aucune notification en attente"
      );
    }

    return NextResponse.json({ success: true, recipients: rhUsers?.length || 0 });
  } catch (error: any) {
    console.error("Daily digest error:", error);
    return NextResponse.json({ error: "Failed to send digest", details: error.message }, { status: 500 });
  }
}
