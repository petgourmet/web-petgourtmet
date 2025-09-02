import { AuthForm } from "@/components/auth/auth-form"
import { ThemedBackground } from "@/components/themed-background"
import { Suspense } from "react"

function LoginContent() {
  return (
    <ThemedBackground theme="default">
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        {/* Imagen de fondo */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/INICIO-CIGgXmDH80S4gra9J0F4aserkg1hNy.webp"
            alt="Pastel gourmet para perros Pet Gourmet"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        {/* Formulario */}
        <div className="relative z-10">
          <AuthForm />
        </div>
      </div>
    </ThemedBackground>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginContent />
    </Suspense>
  )
}
