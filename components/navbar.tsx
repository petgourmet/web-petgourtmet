"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, ChevronDown, User, ShoppingBag, Home, Info, Apple, BookOpen, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartButton } from "@/components/cart-button"
import { useCart } from "@/components/cart-context"
import { CartModal } from "@/components/cart-modal"
import { CheckoutModal } from "@/components/checkout-modal"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { useClientAuth } from "@/hooks/use-client-auth"
import { useMobile } from "@/hooks/use-mobile"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const { showCart, showCheckout } = useCart()
  const { user, isAdmin, signOut } = useClientAuth()
  const isMobile = useMobile()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile) {
      if (isMenuOpen) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = ""
      }
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isMenuOpen, isMobile])

  const toggleSubmenu = (menu: string) => {
    setActiveSubmenu(activeSubmenu === menu ? null : menu)
  }

  return (
    <>
      <header
        className={`w-full sticky top-0 z-50 transition-all duration-500 backdrop-blur-sm ${
          isScrolled ? "bg-primary/90 shadow-md py-2" : "bg-primary py-3"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center relative group z-10">
            <div className="absolute -inset-2 bg-gradient-radial from-white/20 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 cursor-pointer"></div>
            <Image
              src="/petgourmet-logo.png"
              alt="Pet Gourmet Logo"
              width={150}
              height={40}
              className="h-10 md:h-12 w-auto animate-logo-wiggle"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            <div className="relative group">
              <button className="btn-rounded flex items-center space-x-1 text-white hover:text-white/80 btn-glow">
                <span>Productos</span>
                <ChevronDown size={16} />
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                <div className="py-2">
                  <Link
                    href="/productos"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                  >
                    Todos los Productos
                  </Link>
                  <Link
                    href="/celebrar"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                  >
                    Para Celebrar
                  </Link>
                  <Link
                    href="/complementar"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                  >
                    Para Complementar
                  </Link>
                  <Link
                    href="/premiar"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                  >
                    Para Premiar
                  </Link>
                  <Link
                    href="/recetas"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                  >
                    Nuestras Recetas
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/nosotros" className="btn-rounded text-white hover:text-white/80 btn-glow">
              Nosotros
            </Link>
            <Link href="/nutricion" className="btn-rounded text-white hover:text-white/80 btn-glow">
              Nutrición
            </Link>
            <Link href="/blog" className="btn-rounded text-white hover:text-white/80 btn-glow">
              Blog
            </Link>
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <ThemeToggleButton />
            <CartButton />

            {user ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 bg-white hover:bg-white/90 text-primary rounded-full px-4 py-2 shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300 btn-glow">
                  <User size={18} />
                  <span className="max-w-[100px] truncate">{user.email?.split("@")[0]}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                  <div className="py-2">
                    <Link
                      href="/perfil"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                    >
                      Mi Perfil
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white dark:hover:bg-primary"
                      >
                        Panel de Administración
                      </Link>
                    )}

                    <button
                      onClick={signOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                asChild
                className="bg-white hover:bg-white/90 text-primary rounded-full shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300 btn-glow"
              >
                <Link href="/auth/login">Iniciar Sesión</Link>
              </Button>
            )}

            <Button
              asChild
              className="bg-white hover:bg-white/90 text-primary rounded-full shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300 btn-glow"
            >
              <Link href="/productos">Comprar Ahora</Link>
            </Button>
          </div>

          {/* Mobile Menu Button & Icons */}
          <div className="flex items-center space-x-3 lg:hidden">
            <CartButton />
            <ThemeToggleButton />
            <button
              className="p-2 rounded-full bg-white text-primary shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Mobile Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="lg:hidden fixed inset-0 z-40 bg-white dark:bg-gray-900 pt-20 pb-6 overflow-y-auto"
        >
          <div className="container mx-auto px-4">
            {/* User Section */}
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              {user ? (
                <div className="flex flex-col">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <User size={24} />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{user.email?.split("@")[0]}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/perfil"
                      onClick={() => setIsMenuOpen(false)}
                      className="text-sm bg-primary/10 text-primary py-2 px-3 rounded-md flex items-center justify-center"
                    >
                      <User size={16} className="mr-2" />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        setIsMenuOpen(false)
                      }}
                      className="text-sm bg-red-50 text-red-600 py-2 px-3 rounded-md flex items-center justify-center"
                    >
                      <X size={16} className="mr-2" />
                      Cerrar Sesión
                    </button>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="mt-3 text-sm bg-gray-100 text-gray-800 py-2 px-3 rounded-md flex items-center justify-center"
                    >
                      Panel de Administración
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="bg-primary text-white py-3 px-4 rounded-md text-center font-medium"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-md text-center font-medium"
                  >
                    Crear Cuenta
                  </Link>
                </div>
              )}
            </div>

            {/* Main Navigation */}
            <nav className="space-y-1">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center py-3 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Home size={20} className="mr-3 text-primary" />
                <span className="font-medium">Inicio</span>
              </Link>

              {/* Products Submenu */}
              <div>
                <button
                  onClick={() => toggleSubmenu("products")}
                  className="flex items-center justify-between w-full py-3 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    <ShoppingBag size={20} className="mr-3 text-primary" />
                    <span className="font-medium">Productos</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${activeSubmenu === "products" ? "rotate-180" : ""}`}
                  />
                </button>

                {activeSubmenu === "products" && (
                  <div className="ml-10 mt-1 space-y-1 border-l-2 border-primary/20 pl-4">
                    <Link
                      href="/productos"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                    >
                      Todos los Productos
                    </Link>
                    <Link
                      href="/celebrar"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                    >
                      Para Celebrar
                    </Link>
                    <Link
                      href="/complementar"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                    >
                      Para Complementar
                    </Link>
                    <Link
                      href="/premiar"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                    >
                      Para Premiar
                    </Link>
                    <Link
                      href="/recetas"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                    >
                      Nuestras Recetas
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/nosotros"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center py-3 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Info size={20} className="mr-3 text-primary" />
                <span className="font-medium">Nosotros</span>
              </Link>

              <Link
                href="/nutricion"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center py-3 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Apple size={20} className="mr-3 text-primary" />
                <span className="font-medium">Nutrición</span>
              </Link>

              <Link
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center py-3 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <BookOpen size={20} className="mr-3 text-primary" />
                <span className="font-medium">Blog</span>
              </Link>

              <Link
                href="/crear-plan"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center py-3 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Heart size={20} className="mr-3 text-primary" />
                <span className="font-medium">Crear Plan Personalizado</span>
              </Link>
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/productos"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full bg-primary text-white py-3 px-4 rounded-md text-center font-medium mb-3"
              >
                Comprar Ahora
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/contacto"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 py-2 px-3 rounded-md text-center"
                >
                  Contacto
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 py-2 px-3 rounded-md text-center"
                >
                  Preguntas Frecuentes
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales de carrito y checkout */}
      {showCart && <CartModal />}
      {showCheckout && <CheckoutModal />}
    </>
  )
}
