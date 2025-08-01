"use client"

import type { ReactNode } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/sonner"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { ScrollToTop } from "@/components/scroll-to-top"
import WhatsappButton from "@/components/whatsapp-button"
import FloatingCreatePlanButton from "@/components/floating-create-plan-button"
import { CartProvider } from "@/components/cart-context"

export default function ClientLayout({ children }: { children: ReactNode }) {
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
