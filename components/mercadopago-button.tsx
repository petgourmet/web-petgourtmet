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

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window !== "undefined" && isSDKLoaded && preferenceId && !isButtonRendered) {
      try {
        console.log("Intentando renderizar botón de Mercado Pago con preferenceId:", preferenceId)

        // @ts-ignore - Mercado Pago no tiene tipos de TypeScript
        const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY, {
          locale: "es-AR",
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
        })

        setIsButtonRendered(true)
        console.log("Botón de Mercado Pago renderizado correctamente")
      } catch (error) {
        console.error("Error al renderizar el botón de Mercado Pago:", error)
        if (onError) onError(error)
      }
    }
  }, [isSDKLoaded, preferenceId, isButtonRendered, onError])

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

      {!isSDKLoaded && (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando opciones de pago...
        </Button>
      )}

      <div id="mercadopago-button-container" className="w-full">
        {isSDKLoaded && !isButtonRendered && (
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparando botón de pago...
          </Button>
        )}
      </div>
    </div>
  )
}
