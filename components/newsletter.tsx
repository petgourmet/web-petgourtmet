"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Send } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the email to your API
    setSubmitted(true)
  }

  return (
    <section className="responsive-section relative overflow-hidden">
      {/* Fondo con degradado y textura elegante */}
      <div
        className="absolute inset-0 z-0 backdrop-blur-sm"
        style={{
          background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
        }}
      >
        {/* Modo oscuro - degradado */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
          }}
        ></div>

        {/* Textura elegante - patrón de puntos */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(#666666 0.5px, transparent 0.5px)`,
            backgroundSize: "15px 15px",
          }}
        ></div>
      </div>

      <div className="responsive-container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-gray-800 dark:text-white">
            Únete a Nuestra Manada
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-200 font-semibold mb-8">
            Suscríbete a nuestro boletín para ofertas exclusivas, consejos de nutrición y anuncios de nuevos productos.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-grow group">
                <Input
                  type="email"
                  placeholder="Ingresa tu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-grow rounded-full border-primary/20 focus:border-primary focus:ring-primary pr-12 transition-all duration-300 group-hover:shadow-md"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white rounded-full flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 btn-glow font-display"
              >
                <Send className="h-4 w-4" /> Suscribirse
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-center space-x-2 text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 py-3 px-4 rounded-full mx-auto max-w-md shadow-md animate-pulse-soft">
              <Check className="w-5 h-5" />
              <span className="font-display">¡Gracias por suscribirte!</span>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
            Al suscribirte, aceptas nuestra Política de Privacidad y consientes recibir actualizaciones de nuestra
            empresa.
          </p>
        </div>
      </div>
    </section>
  )
}
