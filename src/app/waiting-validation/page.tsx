import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/auth/LogoutButton"
import Link from "next/link"
import { query } from "@/lib/mysql-direct"

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <svg
              className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          En attente de validation
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Votre profil a été soumis avec succès. Il est actuellement en cours de révision par l&apos;équipe RH.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Vous recevrez une notification par email dès que votre profil sera validé ou si des modifications sont nécessaires.
          </p>
        </div>

        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <p>✓ Profil soumis</p>
          <p>⏳ En attente de révision</p>
          <p>📧 Notification par email à venir</p>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <Link
            href="/waiting-validation"
            className="w-full inline-block text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Actualiser le statut
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
