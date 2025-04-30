"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartButton } from "@/components/cart-button"
import { useCart } from "@/components/cart-context"
import { CartModal } from "@/components/cart-modal"
import { CheckoutModal } from "@/components/checkout-modal"
import { ThemeToggleButton } from "@/components/theme-toggle-button"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { showCart, showCheckout } = useCart()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <>
      <header
        className={`w-full sticky top-0 z-50 transition-all duration-500 backdrop-blur-sm ${
          isScrolled ? "bg-primary/80 shadow-md py-2" : "bg-primary py-4"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center relative group">
            <div className="absolute -inset-2 bg-gradient-radial from-white/20 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 cursor-pointer"></div>
            <Image
              src="/petgourmet-logo.png"
              alt="Pet Gourmet Logo"
              width={150}
              height={40}
              className="h-12 w-auto animate-logo-wiggle"
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
            <Button
              asChild
              className="bg-white hover:bg-white/90 text-primary rounded-full shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300 btn-glow"
            >
              <Link href="/productos">Comprar Ahora</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 lg:hidden">
            <ThemeToggleButton />
            <CartButton />
            <button
              className="p-2 rounded-full bg-white text-primary shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-primary/95 backdrop-blur-sm py-4 px-4 shadow-md">
            <nav className="flex flex-col space-y-4">
              <div className="space-y-2">
                <div className="font-medium text-white">Productos</div>
                <div className="pl-4 space-y-2">
                  <Link
                    href="/productos"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-white/80 hover:text-white transition-colors duration-300"
                  >
                    Todos los Productos
                  </Link>
                  <Link
                    href="/celebrar"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-white/80 hover:text-white transition-colors duration-300"
                  >
                    Para Celebrar
                  </Link>
                  <Link
                    href="/complementar"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-white/80 hover:text-white transition-colors duration-300"
                  >
                    Para Complementar
                  </Link>
                  <Link
                    href="/premiar"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-white/80 hover:text-white transition-colors duration-300"
                  >
                    Para Premiar
                  </Link>
                  <Link
                    href="/recetas"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-white/80 hover:text-white transition-colors duration-300"
                  >
                    Nuestras Recetas
                  </Link>
                </div>
              </div>
              <Link
                href="/nosotros"
                onClick={() => setIsMenuOpen(false)}
                className="text-white/80 hover:text-white transition-colors duration-300"
              >
                Nosotros
              </Link>
              <Link
                href="/nutricion"
                onClick={() => setIsMenuOpen(false)}
                className="text-white/80 hover:text-white transition-colors duration-300"
              >
                Nutrición
              </Link>
              <Link
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
                className="text-white/80 hover:text-white transition-colors duration-300"
              >
                Blog
              </Link>
              <Button
                asChild
                className="bg-white hover:bg-white/90 text-primary rounded-full w-full shadow-md hover:shadow-lg hover:shadow-white/20 transition-all duration-300 btn-glow"
              >
                <Link href="/productos" onClick={() => setIsMenuOpen(false)}>
                  Comprar Ahora
                </Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Modales de carrito y checkout */}
      {showCart && <CartModal />}
      {showCheckout && <CheckoutModal />}
    </>
  )
}
