/**
 * Admin Logs Page
 * Wrapper for the AdminLogsDashboard component
 */

import AdminLogsDashboard from "@/components/admin/AdminLogsDashboard";

export const metadata = {
  title: "Journal d'audit | Administration",
  description: "Consultez et exportez les logs d'audit du système",
};

export default function AdminLogsPage() {
  return <AdminLogsDashboard />;
}
