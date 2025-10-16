"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { handleAuthError } from "@/lib/auth-error-handler"
import { useToast } from "@/components/ui/use-toast"
import { ThemedBackground } from "@/components/themed-background"
// import { useAntiSpam } from "@/hooks/useAntiSpam"
import { HoneypotField } from "@/components/security/HoneypotField"
// import { SecurityStatus } from "@/components/security/SecurityStatus"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [honeypotValue, setHoneypotValue] = useState('')
  const router = useRouter()
  const { toast } = useToast()
  
  // Hook anti-spam - DESHABILITADO para evitar errores de reCAPTCHA
  // const { 
  //   submitWithProtection, 
  //   isValidating,
  //   isRecaptchaLoaded 
  // } = useAntiSpam({
  //   action: 'password_reset',
  //   minRecaptchaScore: 0.5
  // })
  
  // Estados para reemplazar el hook anti-spam
  const isValidating = false
  const isRecaptchaLoaded = true

  // Verificar que el usuario tenga una sesión válida para restablecer contraseña
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        toast({
          title: "Error",
          description: "Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.",
          variant: "destructive",
        })
        router.push("/auth/recuperar")
      }
    }

    checkSession()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    try {
      // Enviar directamente sin protección reCAPTCHA
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirmPassword,
          honeypot: honeypotValue
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al restablecer contraseña')
      }

      setHoneypotValue('')
      
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido restablecida correctamente.",
      })

      // Redirigir al perfil después de un breve retraso
      setTimeout(() => {
        router.push("/perfil")
      }, 2000)
    } catch (error: any) {
      console.error("Error al restablecer contraseña:", error)
      const { message } = handleAuthError(error, "reset")
      setError(error instanceof Error ? error.message : message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemedBackground theme="default">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 flex justify-center">
            <Link href="/" className="block relative">
              <Image
                src="/petgourmet-logo.png"
                alt="Pet Gourmet Logo"
                width={180}
                height={60}
                className="h-16 w-auto"
              />
            </Link>
          </div>

          <div className="p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Restablecer Contraseña</h2>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo honeypot para detectar bots */}
              <HoneypotField 
                value={honeypotValue}
                onChange={setHoneypotValue}
              />
              
              {/* Estado de seguridad - DESHABILITADO */}
              {/* <SecurityStatus 
                isValidating={isValidating}
              /> */}
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || isValidating}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    placeholder="********"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading || isValidating}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    placeholder="********"
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isValidating || !isRecaptchaLoaded}
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : !isRecaptchaLoaded ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando seguridad...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
