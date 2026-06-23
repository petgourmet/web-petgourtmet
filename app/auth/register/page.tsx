import { AuthForm } from "@/components/auth/auth-form"
import { ThemedBackground } from "@/components/themed-background"
import { Suspense } from "react"

function RegisterContent() {
  return (
    <ThemedBackground theme="default">
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 z-0">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/INICIO-CIGgXmDH80S4gra9J0F4aserkg1hNy.webp"
            alt="Pastel gourmet para perros Pet Gourmet"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative z-10">
          <AuthForm defaultMode="register" />
        </div>
      </div>
    </ThemedBackground>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
