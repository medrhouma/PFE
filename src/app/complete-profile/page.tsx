import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import EmployeeProfileForm from "@/components/employees/EmployeeProfileForm"
import { query } from "@/lib/mysql-direct"

export default async function CompleteProfilePage() {
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

  // Si l utilisateur est deja ACTIVE, rediriger vers home
  if (currentStatus === "ACTIVE") {
    redirect("/home")
  }

  // Si l utilisateur est en attente, rediriger vers waiting-validation
  if (currentStatus === "PENDING") {
    redirect("/waiting-validation")
  }

  // Recuperer l employe existant pour verifier s il a ete rejete
  const existingEmployees: any = await query(
    'SELECT * FROM Employe WHERE user_id = ?',
    [session.user.id]
  )

  const existingEmployee = existingEmployees && existingEmployees.length > 0 ? existingEmployees[0] : null
  const isRejected = currentStatus === "REJECTED"
  const rejectionReason = existingEmployee?.rejection_reason

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isRejected ? "Completer a nouveau votre profil" : "Completez votre profil"}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isRejected 
              ? "Votre profil a ete rejete. Veuillez corriger les informations et soumettre a nouveau."
              : "Veuillez completer vos informations pour acceder a la plateforme"}
          </p>
        </div>

        {isRejected && rejectionReason && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Raison du rejet :
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{rejectionReason}</p>
          </div>
        )}

        <EmployeeProfileForm />
      </div>
    </div>
  )
}
