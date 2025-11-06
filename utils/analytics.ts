/**
 * Utilidades para Analytics y Data Layer
 * Funciones helper para enviar eventos a Google Tag Manager y Facebook Pixel
 */

// Tipos para los datos de compra
export interface PurchaseItem {
  id?: string | number
  product_id?: string | number
  name: string
  price: number
  quantity: number
  category?: string
  subcategory?: string
  image?: string
}

export interface PurchaseData {
  orderId: string
  orderNumber?: string
  total: number
  subtotal: number
  shipping: number
  tax?: number
  coupon?: string
  items: PurchaseItem[]
  customerEmail?: string
  customerName?: string
}

// Extender la interfaz Window para incluir dataLayer
declare global {
  interface Window {
    dataLayer: any[]
  }
}

/**
 * Push evento de compra al Data Layer de Google Tag Manager
 * Formato compatible con GA4 Enhanced Ecommerce
 */
export const pushPurchaseToDataLayer = (orderData: PurchaseData): void => {
  if (typeof window === 'undefined') return

  try {
    // Inicializar dataLayer si no existe
    window.dataLayer = window.dataLayer || []

    // Limpiar evento anterior de ecommerce
    window.dataLayer.push({ ecommerce: null })

    // Push del evento de compra
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: orderData.orderId,
        value: orderData.total,
        currency: 'MXN',
        tax: orderData.tax || 0,
        shipping: orderData.shipping,
        coupon: orderData.coupon || '',
        items: orderData.items.map((item) => ({
          item_id: (item.product_id || item.id || '').toString(),
          item_name: item.name,
          item_brand: 'PET GOURMET',
          item_category: item.category || 'Productos',
          item_category2: item.subcategory || '',
          price: item.price,
          quantity: item.quantity,
        })),
      },
    })

    console.log('✅ Data Layer - Purchase event pushed:', orderData.orderId)
  } catch (error) {
    console.error('❌ Error pushing to Data Layer:', error)
  }
}

/**
 * Enviar evento de compra a Google Analytics (gtag)
 * Mantiene compatibilidad con implementaciones existentes
 */
export const trackGoogleAnalyticsPurchase = (orderData: PurchaseData): void => {
  if (typeof window === 'undefined' || !window.gtag) return

  try {
    window.gtag('event', 'purchase', {
      transaction_id: orderData.orderId,
      value: orderData.total,
      currency: 'MXN',
      tax: orderData.tax || 0,
      shipping: orderData.shipping,
      items: orderData.items.map((item) => ({
        id: (item.product_id || item.id || '').toString(),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    })

    console.log('✅ Google Analytics - Purchase event tracked:', orderData.orderId)
  } catch (error) {
    console.error('❌ Error tracking Google Analytics purchase:', error)
  }
}

/**
 * Enviar evento de compra a Facebook Pixel
 * Versión enriquecida con más detalles del producto
 */
export const trackFacebookPixelPurchase = (orderData: PurchaseData): void => {
  if (typeof window === 'undefined' || !window.fbq) return

  try {
    window.fbq('track', 'Purchase', {
      value: orderData.total,
      currency: 'MXN',
      content_ids: orderData.items.map((item) => 
        (item.product_id || item.id || '').toString()
      ),
      content_type: 'product',
      contents: orderData.items.map((item) => ({
        id: (item.product_id || item.id || '').toString(),
        quantity: item.quantity,
        item_price: item.price,
      })),
      num_items: orderData.items.reduce((sum, item) => sum + item.quantity, 0),
    })

    console.log('✅ Facebook Pixel - Purchase event tracked:', orderData.orderId)
  } catch (error) {
    console.error('❌ Error tracking Facebook Pixel purchase:', error)
  }
}

/**
 * Función principal para trackear una compra en todas las plataformas
 * Llama a todos los servicios de analytics de forma segura
 */
export const trackPurchase = (orderData: PurchaseData): void => {
  // Data Layer (Google Tag Manager)
  pushPurchaseToDataLayer(orderData)

  // Google Analytics directo (gtag)
  trackGoogleAnalyticsPurchase(orderData)

  // Facebook Pixel
  trackFacebookPixelPurchase(orderData)
}
