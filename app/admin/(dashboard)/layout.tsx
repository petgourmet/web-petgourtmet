import type React from "react"
import { AuthGuard } from "@/components/admin/auth-guard"
import { AdminSidebar as Sidebar } from "@/components/admin/sidebar"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAdmin={true}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </AuthGuard>
  )
}
