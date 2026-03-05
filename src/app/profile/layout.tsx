import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PermissionsProvider } from "@/contexts/PermissionsContext"
import { SessionProvider } from "@/components/providers/SessionProvider"

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </SessionProvider>
  )
}