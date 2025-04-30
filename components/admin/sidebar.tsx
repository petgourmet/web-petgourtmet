"use client"

import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, ShoppingBag, Users, Settings, LogOut, LayoutDashboard, Tag, ImageIcon } from "lucide-react"
import Image from "next/image"

export function AdminSidebar() {
  const { signOut, user } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      title: "Productos",
      href: "/admin/products",
      icon: <Package size={20} />,
    },
    {
      title: "Categorías",
      href: "/admin/categories",
      icon: <Tag size={20} />,
    },
    {
      title: "Pedidos",
      href: "/admin/orders",
      icon: <ShoppingBag size={20} />,
    },
    {
      title: "Usuarios",
      href: "/admin/users",
      icon: <Users size={20} />,
    },
    {
      title: "Imágenes",
      href: "/admin/images",
      icon: <ImageIcon size={20} />,
    },
    {
      title: "Configuración",
      href: "/admin/settings",
      icon: <Settings size={20} />,
    },
  ]

  return (
    <div className="flex h-screen w-64 flex-col bg-white shadow-md dark:bg-gray-800">
      <div className="flex h-16 items-center justify-center border-b px-4 dark:border-gray-700">
        <Link href="/admin/dashboard">
          <Image src="/pet-gourmet-logo-full.png" alt="Pet Gourmet Logo" width={150} height={40} className="h-auto" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t p-4 dark:border-gray-700">
        {user && (
          <div className="mb-4 flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrador</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut size={20} className="mr-3" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
