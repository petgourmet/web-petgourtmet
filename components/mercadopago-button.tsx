"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { Button } from "./ui/button"
import { Loader2, AlertCircle } from "lucide-react"

interface MercadoPagoButtonProps {
  preferenceId: string
  onSuccess?: () => void
  onError?: (error: any) => void
}

declare global {
  interface Window {
    MercadoPago: any
  }
}

export function MercadoPagoButton({ preferenceId, onSuccess, onError }: MercadoPagoButtonProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [isButtonRendered, setIsButtonRendered] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Obtener la clave pública de forma segura desde el servidor
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const response = await fetch("/api/mercadopago/config")
        if (!response.ok) {
          throw new Error("Error al obtener configuración de MercadoPago")
        }
        const data = await response.json()
        if (data.publicKey) {
          setPublicKey(data.publicKey)
          setError(null)
        } else {
          throw new Error("Clave pública no disponible")
        }
      } catch (error) {
        console.error("Error al obtener la clave pública:", error)
        setError("Error al cargar opciones de pago")
        if (onError) onError(error)
      }
    }

    fetchPublicKey()
  }, [onError])

  useEffect(() => {
    // Solo ejecutar en el cliente cuando tengamos la clave pública
    if (typeof window !== "undefined" && isSDKLoaded && preferenceId && publicKey && !isButtonRendered) {
      try {
        console.log("Intentando renderizar botón de Mercado Pago con preferenceId:", preferenceId)

        // Verificar que el SDK esté disponible
        if (!window.MercadoPago) {
          throw new Error("SDK de MercadoPago no está disponible")
        }

        // Crear instancia de MercadoPago
        const mp = new window.MercadoPago(publicKey, {
          locale: "es-MX",
        })

        // Limpiar el contenedor antes de renderizar
        const container = document.getElementById("mercadopago-button-container")
        if (container) {
          container.innerHTML = ""
        }

        // Renderizar el botón de checkout
        mp.checkout({
          preference: {
            id: preferenceId,
          },
          render: {
            container: "#mercadopago-button-container",
            label: "Pagar con Mercado Pago",
          },
          theme: {
            elementsColor: "#e7ae84",
            headerColor: "#e7ae84",
          },
          callbacks: {
            onError: (error: any) => {
              console.error("Error en MercadoPago checkout:", error)
              setError("Error al procesar el pago")
              if (onError) onError(error)
            },
            onReady: () => {
              console.log("Botón de MercadoPago listo")
              setError(null)
            },
          },
        })

        setIsButtonRendered(true)
        console.log("Botón de Mercado Pago renderizado correctamente")
      } catch (error) {
        console.error("Error al renderizar el botón de Mercado Pago:", error)
        setError("Error al cargar el botón de pago")
        if (onError) onError(error)
      }
    }
  }, [isSDKLoaded, preferenceId, publicKey, isButtonRendered, onError, onSuccess])

  return (
    <div className="w-full">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onLoad={() => {
          console.log("SDK de Mercado Pago cargado correctamente")
          setIsSDKLoaded(true)
        }}
        onError={(e) => {
          console.error("Error al cargar el SDK de Mercado Pago:", e)
          setError("Error al cargar SDK de pago")
          if (onError) onError(e)
        }}
      />

      {error && (
        <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {(!isSDKLoaded || !publicKey) && !error && (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando opciones de pago...
        </Button>
      )}

      <div id="mercadopago-button-container" className="w-full">
        {isSDKLoaded && publicKey && !isButtonRendered && !error && (
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparando botón de pago...
          </Button>
        )}
      </div>
    </div>
  )
}
