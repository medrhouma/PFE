import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PermissionsProvider } from "@/contexts/PermissionsContext"

export default async function ParametresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Only SUPER_ADMIN can access parametres pages
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/settings")
  }

  return (
    <PermissionsProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <main className="w-full">
          {children}
        </main>
      </div>
    </PermissionsProvider>
  )
}
