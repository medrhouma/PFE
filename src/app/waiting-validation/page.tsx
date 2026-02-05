import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { query } from "@/lib/mysql-direct"
import WaitingValidationClient from "./WaitingValidationClient"

export default async function WaitingValidationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // SUPER_ADMIN et RH peuvent acceder directement au home
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "RH") {
    redirect("/home")
  }

  // Verifier le statut reel depuis la base de donnees
  const users: any = await query(
    'SELECT status FROM User WHERE id = ?',
    [session.user.id]
  )

  const currentStatus = users && users.length > 0 ? users[0].status : session.user.status

  // Verifier si l'employe existe
  const employees: any = await query(
    'SELECT id FROM Employe WHERE user_id = ?',
    [session.user.id]
  )

  // Si l'employe n'existe pas mais que le statut est PENDING, reinitialiser a INACTIVE
  if ((!employees || employees.length === 0) && currentStatus === "PENDING") {
    await query(
      'UPDATE User SET status = ? WHERE id = ?',
      ["INACTIVE", session.user.id]
    )
    redirect("/complete-profile")
  }

  // Si l'utilisateur est deja ACTIVE, rediriger vers home
  if (currentStatus === "ACTIVE") {
    redirect("/home")
  }

  // Si l'utilisateur est INACTIVE ou REJECTED, rediriger vers complete-profile
  if (currentStatus === "INACTIVE" || currentStatus === "REJECTED") {
    redirect("/complete-profile")
  }

  return <WaitingValidationClient userName={session.user.name || "Collaborateur"} />
}
