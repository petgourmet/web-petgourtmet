import { useCallback } from "react"

// Hook para usar Google Analytics de forma tipada y segura
export function useGoogleAnalytics() {
  // Función para trackear eventos
  const trackEvent = useCallback((action: string, category: string, label?: string, value?: number) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
      })
    }
  }, [])

  // Función para trackear conversiones
  const trackConversion = useCallback((conversionId: string, value?: number, currency: string = "MXN") => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", {
        send_to: conversionId,
        value: value,
        currency: currency,
      })
    }
  }, [])

  // Función para trackear compras (Enhanced Ecommerce)
  const trackPurchase = useCallback((transactionId: string, value: number, items: any[]) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "purchase", {
        transaction_id: transactionId,
        value: value,
        currency: "MXN",
        items: items,
      })
    }
  }, [])

  // Función para trackear vista de productos
  const trackViewItem = useCallback((itemId: string, itemName: string, category: string, value: number) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "view_item", {
        currency: "MXN",
        value: value,
        items: [
          {
            item_id: itemId,
            item_name: itemName,
            category: category,
            price: value,
            quantity: 1,
          },
        ],
      })
    }
  }, [])

  // Función para trackear agregar al carrito
  const trackAddToCart = useCallback((itemId: string, itemName: string, category: string, value: number, quantity: number = 1) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "add_to_cart", {
        currency: "MXN",
        value: value * quantity,
        items: [
          {
            item_id: itemId,
            item_name: itemName,
            category: category,
            price: value,
            quantity: quantity,
          },
        ],
      })
    }
  }, [])

  // Función para trackear inicio de checkout
  const trackBeginCheckout = useCallback((value: number, items: any[]) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "begin_checkout", {
        currency: "MXN",
        value: value,
        items: items,
      })
    }
  }, [])

  // Función para trackear búsquedas
  const trackSearch = useCallback((searchTerm: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "search", {
        search_term: searchTerm,
      })
    }
  }, [])

  return {
    trackEvent,
    trackConversion,
    trackPurchase,
    trackViewItem,
    trackAddToCart,
    trackBeginCheckout,
    trackSearch,
  }
}
