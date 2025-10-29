"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { handleAuthError } from "@/lib/auth-error-handler"
// import { useAntiSpam } from "@/hooks/useAntiSpam"
import { HoneypotField } from "@/components/security/HoneypotField"
// import { SecurityStatus } from "@/components/security/SecurityStatus"

type AuthMode = "login" | "register"

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [honeypotValue, setHoneypotValue] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Hook anti-spam - DESHABILITADO para evitar errores de reCAPTCHA
  // const { 
  //   submitWithProtection, 
  //   isValidating,
  //   isRecaptchaLoaded 
  // } = useAntiSpam({
  //   action: mode === 'login' ? 'auth_login' : 'auth_register',
  //   minRecaptchaScore: 0.6
  // })
  
  // Estados para reemplazar el hook anti-spam
  const isValidating = false
  const isRecaptchaLoaded = true

  // Manejar parámetros de URL para mostrar mensajes
  useEffect(() => {
    const error = searchParams.get('error')
    const verified = searchParams.get('verified')
    
    if (error) {
      toast({
        title: "Error de verificación",
        description: decodeURIComponent(error),
        variant: "destructive",
      })
      // Limpiar el parámetro de error de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      window.history.replaceState({}, '', newUrl.toString())
    }
    
    if (verified === 'true') {
      toast({
        title: "Email verificado",
        description: "Tu email ha sido verificado exitosamente. Ya puedes usar todas las funciones de tu cuenta.",
      })
      // Limpiar el parámetro de verified de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('verified')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, toast])


  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setAcceptTerms(false)
    setHoneypotValue("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones previas
    if (mode === "register") {
      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        })
        return
      }

      if (!acceptTerms) {
        toast({
          title: "Error",
          description: "Debes aceptar los términos y condiciones para registrarte",
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)

    try {
      // Enviar directamente sin protección reCAPTCHA
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          confirmPassword: mode === "register" ? confirmPassword : undefined,
          acceptTerms: mode === "register" ? acceptTerms : undefined,
          honeypot: honeypotValue
        })
      })

      const result = await response.json()

      setHoneypotValue('')

      if (mode === "register") {
        toast({
          title: "Registro exitoso",
          description: "Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.",
        })

        setMode("login")
        setEmail(email)
      } else {
        // Login exitoso
        const redirect = searchParams.get('redirect')
        const subscription = searchParams.get('subscription')
        
        // Si viene de suscripción, ir al checkout
        if (subscription === 'true' && redirect) {
          window.location.href = decodeURIComponent(redirect)
        } else if (redirect) {
          window.location.href = decodeURIComponent(redirect)
        } else {
          // Por defecto ir al home, no al perfil
          window.location.href = "/"
        }
      }
    } catch (error: any) {
      console.error("Error de autenticación:", error)
      
      const { title, message } = handleAuthError(error, mode === "login" ? "login" : "register")
      toast({
        title,
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-6 flex justify-center">
        <Link href="/" className="block relative hover:scale-110 transition-transform duration-300 cursor-pointer">
          <Image src="/petgourmet-logo.png" alt="Pet Gourmet Logo" width={180} height={60} className="h-16 w-auto" />
        </Link>
      </div>

      <div className="p-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
        <h2 className="text-2xl font-bold text-center mb-6">{mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</h2>

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
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || isValidating}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
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

          {mode === "register" && (
            <>
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
                  />
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                  Al registrarte aceptas nuestra{" "}
                  <Link href="/privacidad" className="text-primary hover:underline">
                    Política de Privacidad
                  </Link>
                  {" "}y{" "}
                  <Link href="/terminos" className="text-primary hover:underline">
                    Términos de Servicio
                  </Link>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || isValidating || !isRecaptchaLoaded || (mode === "register" && !acceptTerms)}
            className={`w-full font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
              !isRecaptchaLoaded || (mode === "register" && !acceptTerms)
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-primary hover:bg-primary/90 text-white'
            }`}
          >
            {loading || isValidating ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {isValidating ? 'Verificando...' : (mode === "login" ? "Iniciando sesión..." : "Registrando...")}
              </>
            ) : !isRecaptchaLoaded ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Cargando seguridad...
              </>
            ) : mode === "login" ? (
              "Iniciar Sesión"
            ) : (
              "Registrarse"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={toggleMode} className="text-primary hover:underline text-sm">
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>

        {mode === "login" && (
          <div className="mt-2 text-center">
            <Link href="/auth/recuperar" className="text-primary hover:underline text-sm">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
