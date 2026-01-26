import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushService } from "@/lib/services/push-service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription) {
      return NextResponse.json({ error: "Subscription requise" }, { status: 400 });
    }

    await pushService.saveSubscription(session.user.id, subscription);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Erreur abonnement push" }, { status: 500 });
  }
}
