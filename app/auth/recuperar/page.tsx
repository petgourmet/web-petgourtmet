"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { ThemedBackground } from "@/components/themed-background"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      })
    } catch (error: any) {
      console.error("Error al enviar correo de recuperación:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar el correo de recuperación. Inténtalo de nuevo.",
        variant: "destructive",
      })
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
            <h2 className="text-2xl font-bold text-center mb-6">Recuperar Contraseña</h2>

            {success ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>

                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  Hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>. Por favor, revisa
                  tu bandeja de entrada y sigue las instrucciones.
                </p>

                <div className="flex justify-center">
                  <Link
                    href="/auth/login"
                    className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-md transition-colors"
                  >
                    Volver al inicio de sesión
                  </Link>
                </div>
              </div>
            ) : (
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Enviando...
                    </>
                  ) : (
                    "Enviar correo de recuperación"
                  )}
                </button>

                <div className="mt-4 text-center">
                  <Link href="/auth/login" className="text-primary hover:underline text-sm">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
