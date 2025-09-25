"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/sonner"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { ScrollToTop } from "@/components/scroll-to-top"
import WhatsappButton from "@/components/whatsapp-button"
import { FloatingCreatePlanButton } from "@/components/floating-create-plan-button"
import { CartProvider } from "@/components/cart-context"
import { startSubscriptionMonitoring } from "@/utils/subscription-monitor"

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Inicializar sistema de monitoreo automático de suscripciones
  useEffect(() => {
    // Solo inicializar en producción o cuando esté habilitado explícitamente
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTION_MONITORING === 'true') {
      console.log('🔍 Iniciando sistema de monitoreo de suscripciones...')
      startSubscriptionMonitoring()
    }
  }, [])

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
        <ShadcnToaster />
        <ScrollToTop />
        <WhatsappButton />
        <FloatingCreatePlanButton />
      </div>
    </CartProvider>
  )
}
