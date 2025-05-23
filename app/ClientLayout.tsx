"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import SplashScreen from "@/components/splash-screen"
import { ScrollToTop } from "@/components/scroll-to-top"
import WhatsappButton from "@/components/whatsapp-button"
import FloatingCreatePlanButton from "@/components/floating-create-plan-button"
import { CartProvider } from "@/components/cart-context"
import { Toaster } from "@/components/toaster"

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScrollToTop />
        <WhatsappButton />
        <FloatingCreatePlanButton />
        <Toaster />
      </div>
    </CartProvider>
  )
}
