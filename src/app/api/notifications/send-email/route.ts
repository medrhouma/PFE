import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { emailService } from "@/lib/services/email-service";

// POST /api/notifications/send-email - Send test email or leave request notification
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { type, email, data } = body;

    // Default RH email
    const rhEmail = email || process.env.RH_EMAIL || "rayenchraiet2000@gmail.com";

    switch (type) {
      case "test":
        const testResult = await emailService.sendTestNotificationEmail(rhEmail);
        return NextResponse.json({
          success: testResult.success,
          message: testResult.success
            ? `Email de test envoyé à ${rhEmail}`
            : `Échec de l'envoi`,
        });

      case "leave_request":
        if (!data) {
          return NextResponse.json(
            { error: "Données de la demande requises" },
            { status: 400 }
          );
        }
        
        const { employeeName, leaveType, startDate, endDate, duration, reason } = data;
        
        const leaveResult = await emailService.sendLeaveRequestNotificationEmail(
          rhEmail,
          employeeName,
          leaveType,
          startDate,
          endDate,
          duration,
          reason || ""
        );
        
        return NextResponse.json({
          success: leaveResult.success,
          message: leaveResult.success
            ? `Notification de congé envoyée à ${rhEmail}`
            : `Échec de l'envoi`,
        });

      default:
        return NextResponse.json(
          { error: "Type de notification invalide. Utilisez 'test' ou 'leave_request'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Email notification error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}
