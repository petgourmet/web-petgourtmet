import { useCallback } from "react"

// Hook para usar Facebook Pixel de forma tipada y segura
export function useFacebookPixel() {
  // Función para trackear eventos personalizados
  const trackEvent = useCallback((eventName: string, parameters?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", eventName, parameters)
    }
  }, [])

  // Función para trackear eventos estándar
  const trackStandardEvent = useCallback((eventName: string, parameters?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", eventName, parameters)
    }
  }, [])

  // Función para trackear vista de contenido
  const trackViewContent = useCallback((contentId: string, contentName: string, contentType: string, value?: number) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "ViewContent", {
        content_ids: [contentId],
        content_name: contentName,
        content_type: contentType,
        currency: "MXN",
        value: value,
      })
    }
  }, [])

  // Función para trackear agregar al carrito
  const trackAddToCart = useCallback((contentId: string, contentName: string, value: number, quantity: number = 1) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "AddToCart", {
        content_ids: [contentId],
        content_name: contentName,
        content_type: "product",
        currency: "MXN",
        value: value * quantity,
        quantity: quantity,
      })
    }
  }, [])

  // Función para trackear inicio de checkout
  const trackInitiateCheckout = useCallback((value: number, numItems: number, contentIds: string[]) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "InitiateCheckout", {
        content_ids: contentIds,
        content_type: "product",
        currency: "MXN",
        value: value,
        num_items: numItems,
      })
    }
  }, [])

  // Función para trackear compras
  const trackPurchase = useCallback((
    value: number,
    orderId: string,
    contentIds: string[],
    numItems: number
  ) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", {
        content_ids: contentIds,
        content_type: "product",
        currency: "MXN",
        value: value,
        order_id: orderId,
        num_items: numItems,
      })
    }
  }, [])

  // Función para trackear leads (suscripciones, contactos)
  const trackLead = useCallback((value?: number, contentName?: string) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead", {
        content_name: contentName,
        currency: "MXN",
        value: value,
      })
    }
  }, [])

  // Función para trackear registros completos
  const trackCompleteRegistration = useCallback((registrationMethod?: string) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {
        registration_method: registrationMethod,
      })
    }
  }, [])

  // Función para trackear búsquedas
  const trackSearch = useCallback((searchString: string, contentCategory?: string) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Search", {
        search_string: searchString,
        content_category: contentCategory,
      })
    }
  }, [])

  // Función para trackear suscripciones
  const trackSubscribe = useCallback((value?: number, currency: string = "MXN") => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Subscribe", {
        currency: currency,
        value: value,
      })
    }
  }, [])

  return {
    trackEvent,
    trackStandardEvent,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackLead,
    trackCompleteRegistration,
    trackSearch,
    trackSubscribe,
  }
}
