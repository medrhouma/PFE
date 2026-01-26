import webpush from "web-push";
import { query } from "@/lib/mysql-direct";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

async function ensureTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      subscription JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );
}

export const pushService = {
  async saveSubscription(userId: string, subscription: any) {
    await ensureTable();
    const id = Buffer.from(subscription.endpoint).toString("base64").slice(0, 60);
    await query(
      `INSERT INTO push_subscriptions (id, user_id, subscription)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE subscription = VALUES(subscription)`
      , [id, userId, JSON.stringify(subscription)]
    );
    return { success: true };
  },

  async sendToUser(userId: string, payload: PushPayload) {
    if (!vapidPublicKey || !vapidPrivateKey) return { success: false, reason: "VAPID_NOT_CONFIGURED" };
    await ensureTable();
    const subs: any = await query(
      `SELECT subscription FROM push_subscriptions WHERE user_id = ?`,
      [userId]
    );

    const data = JSON.stringify(payload);

    for (const row of subs || []) {
      try {
        const subscription = JSON.parse(row.subscription);
        await webpush.sendNotification(subscription, data);
      } catch (error) {
        console.error("Push send error:", error);
      }
    }

    return { success: true };
  },

  async sendToRoles(roles: string[], payload: PushPayload) {
    if (!vapidPublicKey || !vapidPrivateKey) return { success: false, reason: "VAPID_NOT_CONFIGURED" };
    await ensureTable();
    const users: any = await query(
      `SELECT id FROM User WHERE role IN (${roles.map(() => "?").join(",")}) AND status = 'ACTIVE'`,
      roles
    );

    for (const user of users || []) {
      await this.sendToUser(user.id, payload);
    }

    return { success: true };
  }
};
