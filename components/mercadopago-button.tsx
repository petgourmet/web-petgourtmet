"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { Button } from "./ui/button"
import { Loader2 } from "lucide-react"

interface MercadoPagoButtonProps {
  preferenceId: string
  onSuccess?: () => void
  onError?: (error: any) => void
}

export function MercadoPagoButton({ preferenceId, onSuccess, onError }: MercadoPagoButtonProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [isButtonRendered, setIsButtonRendered] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  // Obtener la clave pública de forma segura desde el servidor
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const response = await fetch("/api/mercadopago/config")
        const data = await response.json()
        if (data.publicKey) {
          setPublicKey(data.publicKey)
        }
      } catch (error) {
        console.error("Error al obtener la clave pública:", error)
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

        // @ts-ignore - Mercado Pago no tiene tipos de TypeScript
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
            onPaymentSuccess: (data: any) => {
              console.log("Pago exitoso:", data)
              if (onSuccess) onSuccess()
              // Redireccionar a la página de agradecimiento
              window.location.href = "/gracias-por-tu-compra?order_id=" + data.external_reference
            },
          },
        })

        setIsButtonRendered(true)
        console.log("Botón de Mercado Pago renderizado correctamente")
      } catch (error) {
        console.error("Error al renderizar el botón de Mercado Pago:", error)
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
          if (onError) onError(e)
        }}
      />

      {(!isSDKLoaded || !publicKey) && (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando opciones de pago...
        </Button>
      )}

      <div id="mercadopago-button-container" className="w-full">
        {isSDKLoaded && publicKey && !isButtonRendered && (
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparando botón de pago...
          </Button>
        )}
      </div>
    </div>
  )
}
