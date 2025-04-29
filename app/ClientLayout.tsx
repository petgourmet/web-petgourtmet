"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Montserrat, Baloo_2 } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/toaster"
import { CartProvider } from "@/components/cart-context"
import { ScrollToTop } from "@/components/scroll-to-top"
import { IngredientsParticlesBackgroundDynamic } from "@/components/ingredients-particles-background-dynamic"
import FloatingCreatePlanButton from "@/components/floating-create-plan-button"
import SplashScreen from "@/components/splash-screen"
import { usePathname } from "next/navigation"

// Fuente principal para el contenido general
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

// Fuente llamativa similar al logo para títulos destacados
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
})

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [showSplash, setShowSplash] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Verificar si es la primera carga de la sesión
    const isFirstLoad = !sessionStorage.getItem("hasVisited")

    if (isFirstLoad && pathname === "/") {
      // Solo mostrar splash en la primera carga de la página principal
      setShowSplash(true)
      sessionStorage.setItem("hasVisited", "true")
    } else {
      // Si no es la primera carga, mostrar el contenido inmediatamente
      setContentLoaded(true)
    }
  }, [pathname])

  const handleLoadingComplete = () => {
    setContentLoaded(true)
  }

  return (
    <>
      <CartProvider>
        {/* La pantalla de carga solo se muestra en la primera visita a la página principal */}
        {showSplash && <SplashScreen onLoadingComplete={handleLoadingComplete} />}

        {/* El contenido principal se muestra inmediatamente si no hay splash o después de que termina */}
        <div
          className={`transition-opacity duration-500 ${contentLoaded || !showSplash ? "opacity-100" : "opacity-0"}`}
        >
          <ScrollToTop />
          <IngredientsParticlesBackgroundDynamic
            count={30}
            opacity={0.8}
            speed={1.8}
            maxSize={70}
            minSize={30}
            zIndex={-1}
            depthEffect={true}
          />
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster />
          <FloatingCreatePlanButton />
        </div>
      </CartProvider>
    </>
  )
}
