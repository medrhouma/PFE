import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/dashboard/Navbar"
import { SidebarNew } from "@/components/dashboard/SidebarNew"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { query } from "@/lib/mysql-direct"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  let showSidebar = false

  // Pour RH et SUPER_ADMIN, toujours afficher la sidebar
  if (session.user.role === "RH" || session.user.role === "SUPER_ADMIN") {
    showSidebar = true
  }
  // Pour les USER, vérifier le statut réel dans la BD
  else if (session.user.role === "USER") {
    // Vérifier le statut User dans la BD
    const users: any = await query(
      'SELECT status FROM User WHERE id = ?',
      [session.user.id]
    )

    const currentUserStatus = users && users.length > 0 ? users[0].status : null

    // Vérifier si l'employé existe et son statut
    const employees: any = await query(
      'SELECT status FROM Employe WHERE user_id = ?',
      [session.user.id]
    )

    const employeeExists = employees && employees.length > 0
    const employeeStatus = employeeExists ? employees[0].status : null

    // Si l'employé n'existe pas mais le user est PENDING ou ACTIVE, réinitialiser
    if (!employeeExists && (currentUserStatus === 'PENDING' || currentUserStatus === 'ACTIVE')) {
      await query(
        'UPDATE User SET status = ? WHERE id = ?',
        ['INACTIVE', session.user.id]
      )
      redirect('/complete-profile')
    }

    // Si l'employé est rejeté, mettre à jour le User.status et rediriger
    if (employeeExists && employeeStatus === 'REJETE' && currentUserStatus !== 'REJECTED') {
      await query(
        'UPDATE User SET status = ? WHERE id = ?',
        ['REJECTED', session.user.id]
      )
      redirect('/complete-profile')
    }

    // Si l'employé est en attente
    if (employeeExists && employeeStatus === 'EN_ATTENTE' && currentUserStatus !== 'PENDING') {
      await query(
        'UPDATE User SET status = ? WHERE id = ?',
        ['PENDING', session.user.id]
      )
      redirect('/waiting-validation')
    }

    // Afficher la sidebar uniquement si approuvé ET statut ACTIVE
    showSidebar = employeeExists && employeeStatus === 'APPROUVE' && currentUserStatus === 'ACTIVE'
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        {/* Fixed Navbar */}
        <Navbar />
        
        {showSidebar ? (
          <div className="flex">
            {/* Fixed Sidebar */}
            <SidebarNew userRole={session.user.role} />
            
            {/* Main Content - with proper margin for sidebar */}
            <main className="flex-1 lg:ml-64 pt-16 min-h-screen">
              <div className="p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        ) : (
          <main className="pt-16 min-h-screen">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        )}
      </div>
    </SessionProvider>
  )
}