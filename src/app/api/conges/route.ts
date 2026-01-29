import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { notificationService } from "@/lib/services/notification-service";
import { emailService } from "@/lib/services/email-service";
import { auditLogger } from "@/lib/services/audit-logger";
import { checkRateLimit, getClientIP } from "@/lib/security-middleware";

// GET - Récupérer les demandes de congé de l'utilisateur
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const requests: any = await query(
      `SELECT * FROM demande_conge WHERE userId = ? ORDER BY date_debut DESC`,
      [session.user.id]
    );

    const formattedRequests = requests.map((req: any) => {
      // Calculate duration in days
      const start = new Date(req.date_debut);
      const end = new Date(req.date_fin);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: req.id,
        type: req.type,
        startDate: req.date_debut,
        endDate: req.date_fin,
        duration: duration,
        reason: req.commentaire || "",
        status: req.status,
        createdAt: req.created_at || new Date().toISOString()
      };
    });

    return NextResponse.json(formattedRequests);
  } catch (error: any) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle demande de congé
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Rate limiting
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(`conges:${session.user.id}`, "api");
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de demandes. Veuillez patienter." },
        { status: 429 }
      );
    }

    const { type, startDate, endDate, reason } = await req.json();

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Validate leave type
    const validTypes = ['PAID', 'UNPAID', 'MATERNITE', 'MALADIE', 'PREAVIS'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type de congé invalide" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Format de date invalide" },
        { status: 400 }
      );
    }

    // Check if start date is not in the past (allow today)
    if (start < today) {
      return NextResponse.json(
        { error: "La date de début ne peut pas être dans le passé" },
        { status: 400 }
      );
    }

    // Calculate duration
    const durationMs = end.getTime() - start.getTime();
    const duration = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1;

    if (duration <= 0) {
      return NextResponse.json(
        { error: "La date de fin doit être après la date de début" },
        { status: 400 }
      );
    }

    // Générer un ID unique
    const demandeId = `conge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer la demande dans la base de données
    await query(
      `INSERT INTO demande_conge (id, userId, type, date_debut, date_fin, status, commentaire) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [demandeId, session.user.id, type, start, end, 'EN_ATTENTE', reason || null]
    );

    console.log("✅ Leave request created:", demandeId);

    // Log the leave request creation
    await auditLogger.logLeaveRequest(
      "created",
      demandeId,
      session.user.id!,
      undefined,
      ip,
      req.headers.get("user-agent") || undefined,
      {
        leaveType: type,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        reason,
      }
    );

    // Send notifications
    try {
      console.log("📧 Starting notification process...");

      // Notify RH and Super Admins only
      console.log("🔍 Fetching RH and Admin users...");
      const rhUsers: any = await query(
        `SELECT id, name, email, role FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE'`
      );
      console.log(`📋 Found ${rhUsers?.length || 0} RH/Admin users:`, rhUsers);

      if (rhUsers && rhUsers.length > 0) {
        const userName = session.user.name || session.user.email || 'Un employé';
        const formattedDate = start.toLocaleDateString('fr-FR');
        
        // Separate RH and Super Admin users
        const rhOnly = rhUsers.filter((u: any) => u.role === 'RH');
        const superAdmins = rhUsers.filter((u: any) => u.role === 'SUPER_ADMIN');
        
        // Notify RH users
        if (rhOnly.length > 0) {
          const rhUserIds = rhOnly.map((rh: any) => rh.id);
          console.log(`📨 Sending notifications to ${rhUserIds.length} RH users:`, rhUserIds);
          await notificationService.notifyRHLeaveRequest(
            rhUserIds,
            userName,
            type,
            duration,
            formattedDate,
            demandeId
          );
          console.log(`✅ Notified ${rhOnly.length} RH users`);
        }
        
        // Notify Super Admins
        if (superAdmins.length > 0) {
          const adminIds = superAdmins.map((admin: any) => admin.id);
          console.log(`📨 Sending notifications to ${adminIds.length} Super Admins:`, adminIds);
          await notificationService.notifyRHLeaveRequest(
            adminIds,
            userName,
            type,
            duration,
            formattedDate,
            demandeId
          );
          console.log(`✅ Notified ${superAdmins.length} Super Admins`);
        }

        // Send email notifications to RH
        const rhEmail = process.env.RH_EMAIL || "rayenchraiet2000@gmail.com";
        const formattedStartDate = start.toLocaleDateString('fr-FR');
        const formattedEndDate = end.toLocaleDateString('fr-FR');
        
        try {
          console.log(`📧 Sending email notification to RH: ${rhEmail}`);
          await emailService.sendLeaveRequestNotificationEmail(
            rhEmail,
            userName,
            type,
            formattedStartDate,
            formattedEndDate,
            duration,
            reason || ""
          );
          console.log(`✅ Email sent to RH`);
        } catch (emailError) {
          console.error("❌ Error sending email:", emailError);
        }
      } else {
        console.warn("⚠️ No RH or SUPER_ADMIN users found!");
      }
    } catch (notifError) {
      console.error("Error sending notifications:", notifError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Demande de congé soumise avec succès",
      request: {
        id: demandeId,
        type,
        startDate: start,
        endDate: end,
        duration,
        reason,
        status: 'EN_ATTENTE',
      }
    });
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la demande", details: error.message },
      { status: 500 }
    );
  }
}
