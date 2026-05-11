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

  // view_item: se muestra la página de detalle de un producto
  const trackViewItem = useCallback((
    itemId: string,
    itemName: string,
    category: string,
    value: number,
    brand?: string,
    variant?: string,
  ) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "view_item", {
        currency: "MXN",
        value: value,
        items: [
          {
            item_id: itemId,
            item_name: itemName,
            item_brand: brand || "PET GOURMET",
            item_category: category,
            ...(variant ? { item_variant: variant } : {}),
            price: value,
            quantity: 1,
          },
        ],
      })
    }
  }, [])

  // add_to_cart: un artículo fue añadido al carrito
  const trackAddToCart = useCallback((
    itemId: string,
    itemName: string,
    category: string,
    value: number,
    quantity: number = 1,
    brand?: string,
    variant?: string,
  ) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "add_to_cart", {
        currency: "MXN",
        value: value * quantity,
        items: [
          {
            item_id: itemId,
            item_name: itemName,
            item_brand: brand || "PET GOURMET",
            item_category: category,
            ...(variant ? { item_variant: variant } : {}),
            price: value,
            quantity: quantity,
          },
        ],
      })
    }
  }, [])

  // begin_checkout: el usuario inició el proceso de pago
  const trackBeginCheckout = useCallback((value: number, items: any[]) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "begin_checkout", {
        currency: "MXN",
        value: value,
        items: items,
      })
    }
  }, [])

  // view_cart: el usuario abrió su carrito
  const trackViewCart = useCallback((value: number, items: any[]) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "view_cart", {
        currency: "MXN",
        value: value,
        items: items,
      })
    }
  }, [])

  // add_shipping_info: el usuario proporcionó su información de envío
  const trackAddShippingInfo = useCallback((value: number, items: any[], shippingTier: string = "Standard") => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "add_shipping_info", {
        currency: "MXN",
        value: value,
        shipping_tier: shippingTier,
        items: items,
      })
    }
  }, [])

  // add_payment_info: el usuario proporcionó sus datos de pago
  const trackAddPaymentInfo = useCallback((value: number, items: any[], paymentType: string = "Credit Card") => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "add_payment_info", {
        currency: "MXN",
        value: value,
        payment_type: paymentType,
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
    trackViewCart,
    trackAddShippingInfo,
    trackAddPaymentInfo,
    trackSearch,
  }
}
