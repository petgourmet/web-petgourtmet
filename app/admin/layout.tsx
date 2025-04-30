import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

export const metadata: Metadata = {
  title: "Panel de Administración - Pet Gourmet",
  description: "Panel de administración para gestionar productos y pedidos de Pet Gourmet",
}

const inter = Inter({ subsets: ["latin"] })

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={`${inter.className} min-h-screen bg-gray-100`}>{children}</div>
}
