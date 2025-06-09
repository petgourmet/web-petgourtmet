"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

type AuthMode = "login" | "register"

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login")
    // Limpiar campos al cambiar de modo
    setEmail("")
    setPassword("")
    setConfirmPassword("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

        // Registrar nuevo usuario
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        toast({
          title: "Registro exitoso",
          description: "Por favor, verifica tu correo electrónico para confirmar tu cuenta.",
        })

        // Redirigir a página de verificación
        router.push("/auth/verificar")
      } else {
        // Iniciar sesión
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido de nuevo a Pet Gourmet",
        })

        // Redirigir al perfil del usuario
        router.push("/perfil")
      }
    } catch (error: any) {
      console.error("Error de autenticación:", error)

      let errorMessage = "Ha ocurrido un error. Por favor, inténtalo de nuevo."

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Credenciales inválidas. Verifica tu correo y contraseña."
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Por favor, confirma tu correo electrónico antes de iniciar sesión."
      } else if (error.message.includes("already registered")) {
        errorMessage = "Este correo ya está registrado. Intenta iniciar sesión."
      }

      toast({
        title: "Error",
        description: errorMessage,
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
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {mode === "login" ? "Iniciando sesión..." : "Registrando..."}
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
