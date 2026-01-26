import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { notificationService } from "@/lib/services/notification-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Only RH and SUPER_ADMIN can approve/reject
    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id: requestId } = await params;
    const { status, comments } = await req.json();

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      );
    }

    // Get the leave request details
    const leaveRequests: any = await query(
      `SELECT dc.*, u.name as user_name, u.email as user_email
       FROM demande_conge dc
       JOIN User u ON dc.userId = u.id
       WHERE dc.id = ?`,
      [requestId]
    );

    if (!leaveRequests || leaveRequests.length === 0) {
      return NextResponse.json(
        { error: "Demande non trouvée" },
        { status: 404 }
      );
    }

    const leaveRequest = leaveRequests[0];

    // Map status to database enum
    const dbStatus = status === "APPROVED" ? "VALIDE" : "REFUSE";

    // Update the request
    await query(
      `UPDATE demande_conge SET status = ?, commentaire = ? WHERE id = ?`,
      [dbStatus, comments || leaveRequest.commentaire, requestId]
    );

    console.log(`✅ Leave request ${requestId} ${status}`);

    // Send notifications
    try {
      const startDate = new Date(leaveRequest.date_debut).toLocaleDateString('fr-FR');
      const endDate = new Date(leaveRequest.date_fin).toLocaleDateString('fr-FR');

      if (status === "APPROVED") {
        await notificationService.notifyLeaveRequestApproved(
          leaveRequest.userId,
          leaveRequest.type,
          startDate,
          endDate
        );
        console.log("✅ User notified: leave approved");
      } else {
        await notificationService.notifyLeaveRequestRejected(
          leaveRequest.userId,
          leaveRequest.type,
          comments
        );
        console.log("✅ User notified: leave rejected");
      }

      // Notify RH and Super Admins of the decision
      const admins: any = await query(
        `SELECT id FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE'`
      );

      if (admins && admins.length > 0) {
        const adminIds = Array.from(new Set(admins.map((admin: any) => admin.id))) as string[];
        const userName = leaveRequest.user_name || leaveRequest.user_email;
        const deciderName = session.user.name || 'RH';
        
        await notificationService.notifyAdminSystemEvent(
          adminIds,
          "Décision sur demande de congé",
          `${deciderName} a ${status === 'APPROVED' ? 'approuvé' : 'rejeté'} la demande de congé de ${userName}`,
          "NORMAL"
        );
        console.log(`✅ Notified ${adminIds.length} RH/Super Admins`);
      }
    } catch (notifError) {
      console.error("Error sending notifications:", notifError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: `Demande ${status === "APPROVED" ? "approuvée" : "rejetée"} avec succès`,
    });
  } catch (error: any) {
    console.error("Error updating leave request:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la demande" },
      { status: 500 }
    );
  }
}

// PUT - Edit leave request (User can edit their own pending requests)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const { type, startDate, endDate, reason } = await req.json();

    // Get the leave request
    const leaveRequests: any = await query(
      `SELECT * FROM demande_conge WHERE id = ?`,
      [requestId]
    );

    if (!leaveRequests || leaveRequests.length === 0) {
      return NextResponse.json(
        { error: "Demande non trouvée" },
        { status: 404 }
      );
    }

    const leaveRequest = leaveRequests[0];

    // Check if user owns this request
    if (leaveRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que vos propres demandes" },
        { status: 403 }
      );
    }

    // Can only edit pending requests
    if (leaveRequest.status !== "EN_ATTENTE") {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que les demandes en attente" },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Dates invalides" },
          { status: 400 }
        );
      }

      if (end < start) {
        return NextResponse.json(
          { error: "La date de fin doit être après la date de début" },
          { status: 400 }
        );
      }
    }

    // Update the request
    await query(
      `UPDATE demande_conge 
       SET type = COALESCE(?, type),
           date_debut = COALESCE(?, date_debut),
           date_fin = COALESCE(?, date_fin),
           commentaire = COALESCE(?, commentaire)
       WHERE id = ?`,
      [type || null, startDate || null, endDate || null, reason || null, requestId]
    );

    console.log(`✅ Leave request ${requestId} updated by user`);

    return NextResponse.json({
      success: true,
      message: "Demande modifiée avec succès"
    });
  } catch (error: any) {
    console.error("Error editing leave request:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la demande" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/Delete leave request
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: requestId } = await params;

    // Get the leave request
    const leaveRequests: any = await query(
      `SELECT * FROM demande_conge WHERE id = ?`,
      [requestId]
    );

    if (!leaveRequests || leaveRequests.length === 0) {
      return NextResponse.json(
        { error: "Demande non trouvée" },
        { status: 404 }
      );
    }

    const leaveRequest = leaveRequests[0];

    // Check permissions: User can delete their own pending requests, RH/Admin can delete any
    const isOwner = leaveRequest.userId === session.user.id;
    const isRHOrAdmin = session.user.role === "RH" || session.user.role === "SUPER_ADMIN";

    if (!isOwner && !isRHOrAdmin) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que vos propres demandes" },
        { status: 403 }
      );
    }

    // Users can only delete pending requests
    if (isOwner && !isRHOrAdmin && leaveRequest.status !== "EN_ATTENTE") {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que les demandes en attente" },
        { status: 400 }
      );
    }

    // Delete the request
    await query(
      `DELETE FROM demande_conge WHERE id = ?`,
      [requestId]
    );

    console.log(`✅ Leave request ${requestId} deleted by ${session.user.id}`);

    // Notify RH if a user cancels their request
    if (isOwner && leaveRequest.status === "EN_ATTENTE") {
      try {
        const rhUsers: any = await query(
          `SELECT id FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE'`
        );

        if (rhUsers && rhUsers.length > 0) {
          const userName = session.user.name || session.user.email || "Un employé";
          
          for (const rh of rhUsers) {
            await notificationService.create({
              userId: rh.id,
              type: "LEAVE_REQUEST",
              title: "Demande de congé annulée",
              message: `${userName} a annulé sa demande de congé`,
              priority: "NORMAL"
            });
          }
        }
      } catch (notifError) {
        console.error("Error sending cancellation notifications:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Demande supprimée avec succès"
    });
  } catch (error: any) {
    console.error("Error deleting leave request:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la demande" },
      { status: 500 }
    );
  }
}
