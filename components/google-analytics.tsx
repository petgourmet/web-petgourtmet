"use client"

import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-W4V4C0VK09"

// Declaración de tipos para gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export function GoogleAnalytics() {
  // Solo cargar en producción o si está explícitamente habilitado
  const isProduction = process.env.NODE_ENV === "production"
  const isEnabled = process.env.NEXT_PUBLIC_GA_ENABLED === "true" || isProduction

  if (!isEnabled || !GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      {/* GA — carga después de interactividad */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        onError={(e) => {
          console.warn('Google Analytics failed to load:', e)
        }}
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          try {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function(){ window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', '${GA_MEASUREMENT_ID}', {
              transport_type: 'beacon',
              cookie_flags: 'SameSite=None;Secure'
            });
          } catch (error) {
            console.warn('Google Analytics initialization error:', error);
          }
        `}
      </Script>
    </>
  )
}

// Hook para tracking de eventos personalizados
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Hook para tracking de conversiones
export const trackConversion = (conversionId: string, value?: number, currency: string = "MXN") => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: conversionId,
      value: value,
      currency: currency,
    })
  }
}

// Hook para tracking de compras
export const trackPurchase = (transactionId: string, value: number, items: any[]) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "purchase", {
      transaction_id: transactionId,
      value: value,
      currency: "MXN",
      items: items,
    })
  }
}
