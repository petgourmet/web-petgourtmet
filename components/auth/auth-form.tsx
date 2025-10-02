"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Clock, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { handleAuthError } from "@/lib/auth-error-handler"

type AuthMode = "login" | "register"

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

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
    // Limpiar campos al cambiar de modo
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setAcceptTerms(false)
  }

  // Función para manejar el cooldown cuando hay rate limit
  const startCooldown = useCallback((seconds: number = 300) => {
    setRateLimited(true)
    setCooldownTime(seconds)
    
    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setRateLimited(false)
          setRetryCount(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Función para reintentar después del rate limit
  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      toast({
        title: "Demasiados intentos",
        description: "Has alcanzado el límite máximo de reintentos. Por favor, espera 5 minutos antes de intentar nuevamente.",
        variant: "destructive",
      })
      startCooldown(300) // 5 minutos
      return
    }

    setRetryCount(prev => prev + 1)
    // Esperar un tiempo progresivo antes del reintento
    const waitTime = Math.min(30000 * Math.pow(2, retryCount), 120000) // Max 2 minutos
    
    toast({
      title: "Reintentando...",
      description: `Esperando ${waitTime / 1000} segundos antes del reintento ${retryCount + 1}/3`,
    })

    setTimeout(() => {
      handleSubmit(new Event('submit') as any, true)
    }, waitTime)
  }, [retryCount, toast, startCooldown])

  const handleSubmit = async (e: React.FormEvent, isRetry: boolean = false) => {
    e.preventDefault()
    
    if (rateLimited && !isRetry) {
      toast({
        title: "Límite de tasa activo",
        description: `Debes esperar ${Math.floor(cooldownTime / 60)}:${(cooldownTime % 60).toString().padStart(2, '0')} antes de intentar nuevamente.`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (mode === "register") {
        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
          toast({
            title: "Error",
            description: "Las contraseñas no coinciden",
            variant: "destructive",
          })
          return
        }

        // Validar que se hayan aceptado los términos
        if (!acceptTerms) {
          toast({
            title: "Error",
            description: "Debes aceptar los términos y condiciones para registrarte",
            variant: "destructive",
          })
          return
        }

        // Registro sin confirmación de email
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined, // No enviar email de confirmación
          }
        })

        if (error) throw error

        // Si el usuario se creó exitosamente, crear el perfil manualmente
        if (data.user && !data.user.email_confirmed_at) {
          // Crear perfil directamente usando el service role
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              role: 'user'
            })

          if (profileError) {
            console.warn('Error creando perfil:', profileError)
            // No lanzar error, el trigger debería manejarlo
          }
        }

        // Reset estados de rate limit en caso de éxito
        setRateLimited(false)
        setRetryCount(0)
        setCooldownTime(0)

        toast({
          title: "Registro exitoso",
          description: "Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.",
        })

        // Cambiar a modo login automáticamente
        setMode("login")
        setEmail(email) // Mantener el email para facilitar el login
      } else {
        // Iniciar sesión
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Reset estados de rate limit en caso de éxito
        setRateLimited(false)
        setRetryCount(0)
        setCooldownTime(0)

        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido de nuevo a Pet Gourmet",
        })

        // Manejar redirección después del login
        const redirect = searchParams.get('redirect')
        const mpParams = searchParams.get('mp_params')
        
        if (redirect) {
          // Si hay parámetros de MP, reconstruir la URL completa
          if (mpParams) {
            const decodedParams = decodeURIComponent(mpParams)
            router.push(`${redirect}?${decodedParams}`)
          } else {
            router.push(redirect)
          }
        } else {
          // Redirigir al perfil por defecto
          router.push("/perfil")
        }
      }
    } catch (error: any) {
      console.error("Error de autenticación:", error)
      const errorMessage = error?.message || error?.toString() || ''
      
      // Manejo específico para rate limit
      if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('Too many requests')) {
        if (!isRetry) {
          toast({
            title: "Límite de correos excedido",
            description: "Has enviado demasiados correos. Reintentaremos automáticamente en unos momentos.",
          })
        }
        startCooldown(60) // 1 minuto inicial
        return
      }
      
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
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
            disabled={loading || rateLimited || (mode === "register" && !acceptTerms)}
            className={`w-full font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
              rateLimited || (mode === "register" && !acceptTerms)
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-primary hover:bg-primary/90 text-white'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {mode === "login" ? "Iniciando sesión..." : "Registrando..."}
              </>
            ) : rateLimited ? (
              <>
                <Clock className="mr-2" size={18} />
                Espera {Math.floor(cooldownTime / 60)}:{(cooldownTime % 60).toString().padStart(2, '0')}
              </>
            ) : mode === "login" ? (
              "Iniciar Sesión"
            ) : (
              "Registrarse"
            )}
          </button>

          {rateLimited && retryCount > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="text-yellow-600 mr-2" size={16} />
                  <span className="text-sm text-yellow-800">
                    Reintento {retryCount}/3 programado
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-sm text-yellow-600 hover:text-yellow-800 flex items-center"
                >
                  <RefreshCw size={14} className="mr-1" />
                  Reintentar ahora
                </button>
              </div>
            </div>
          )}

          {rateLimited && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <Clock className="text-blue-600 mr-2" size={16} />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Límite de correos alcanzado</p>
                  <p>Se ha detectado demasiados intentos de envío de correos. Por tu seguridad, debes esperar antes de intentar nuevamente.</p>
                </div>
              </div>
            </div>
          )}
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
