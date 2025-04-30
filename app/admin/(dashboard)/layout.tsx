"use client"

import type React from "react"

import { AdminSidebar } from "@/components/admin/sidebar"
import AuthGuard from "@/components/admin/auth-guard"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 overflow-auto">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
