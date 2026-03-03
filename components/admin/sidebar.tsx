"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, ShoppingBag, LogOut, LayoutDashboard, Tag, FileText, CreditCard, ChevronLeft, ChevronRight, Menu } from "lucide-react"

export function AdminSidebar() {
  const { signOut, user } = useAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive collapse on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(true)
      } else {
        setIsCollapsed(false)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
      title: "Blogs",
      href: "/admin/blogs",
      icon: <FileText size={20} />,
    },
    {
      title: "Pedidos",
      href: "/admin/orders",
      icon: <ShoppingBag size={20} />,
    },
    {
      title: "Suscripciones",
      href: "/admin/subscription-orders",
      icon: <CreditCard size={20} />,
    },
  ]

  return (
    <div
      className={`relative flex h-screen flex-col bg-white shadow-md transition-all duration-300 dark:bg-gray-800 flex-shrink-0 ${isCollapsed ? "w-14 md:w-16" : "w-64"
        } ${isMobile && !isCollapsed ? "absolute z-50 h-full" : ""}`}
    >
      {/* Toggle Button for Desktop */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Header */}
      <div className={`flex h-16 md:h-20 items-center border-b dark:border-gray-700 ${isCollapsed ? "justify-center px-1" : "justify-between px-4"}`}>
        {!isCollapsed ? (
          <Link href="/admin/dashboard" className="truncate flex-1">
            <h1 className="text-xl font-bold text-primary">Pet Gourmet</h1>
          </Link>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Expandir menú"
          >
            <Menu size={22} className="md:w-6 md:h-6" />
          </button>
        )}

        {(!isCollapsed) && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 md:hidden block"
            aria-label="Contraer menú"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <div
              key={item.href}
              className={`flex items-center rounded-md cursor-pointer transition-colors ${isCollapsed ? "justify-center py-3" : "px-3 py-2"
                } ${isActive(item.href)
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              onClick={() => {
                if (isMobile && !isCollapsed) {
                  setIsCollapsed(true)
                }
                window.location.href = item.href
              }}
              title={isCollapsed ? item.title : undefined}
            >
              <div className={`${isCollapsed ? "scale-90 md:scale-100" : "mr-3 shrink-0"}`}>{item.icon}</div>
              {!isCollapsed && <span className="text-sm font-medium truncate">{item.title}</span>}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className={`border-t dark:border-gray-700 flex flex-col items-center transition-all ${isCollapsed ? "p-2" : "p-4"}`}>
        {user && (
          <div className={`mb-4 flex items-center w-full ${isCollapsed ? "justify-center" : ""}`}>
            <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-white font-medium shadow-sm ${isCollapsed ? "h-6 w-6 text-xs md:h-8 md:w-8 md:text-sm" : "h-8 w-8 text-sm"}`}>
              {user.email?.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200" title={user.email || ""}>
                  {user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrador</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => signOut()}
          className={`flex items-center rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 w-full transition-colors ${isCollapsed ? "justify-center p-2" : "px-3 py-2"
            }`}
          title={isCollapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut size={isCollapsed ? 20 : 20} className={isCollapsed ? "md:w-5 md:h-5 w-4 h-4" : "mr-3 shrink-0"} />
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  )
}
