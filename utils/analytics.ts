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
  brand?: string
  variant?: string
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
  affiliation?: string
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
 * Incluye todos los campos opcionales según especificación de Google
 */
export const pushPurchaseToDataLayer = (orderData: PurchaseData): void => {
  if (typeof window === 'undefined') return

  try {
    // Inicializar dataLayer si no existe
    window.dataLayer = window.dataLayer || []

    // Limpiar evento anterior de ecommerce
    window.dataLayer.push({ ecommerce: null })

    // Construir objeto de ecommerce con todos los campos disponibles
    const ecommerceData: any = {
      transaction_id: orderData.orderId,
      value: orderData.total.toFixed(2),
      currency: 'MXN',
      items: orderData.items.map((item) => ({
        item_name: item.name,
        item_id: (item.product_id || item.id || '').toString(),
        price: item.price.toFixed(2),
        item_brand: item.brand || 'PET GOURMET',
        item_category: item.category || 'Productos',
        quantity: item.quantity,
        // Campos opcionales - solo se incluyen si existen
        ...(item.subcategory && { item_category2: item.subcategory }),
        ...(item.variant && { item_variant: item.variant }),
      })),
    }

    // Agregar campos opcionales solo si tienen valor
    if (orderData.tax && orderData.tax > 0) {
      ecommerceData.tax = orderData.tax.toFixed(2)
    }
    
    if (orderData.shipping && orderData.shipping > 0) {
      ecommerceData.shipping = orderData.shipping.toFixed(2)
    }
    
    if (orderData.coupon) {
      ecommerceData.coupon = orderData.coupon
    }
    
    if (orderData.affiliation) {
      ecommerceData.affiliation = orderData.affiliation
    }

    // Push del evento de compra
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: ecommerceData,
    })

    console.log('✅ [GTM] Purchase event pushed to Data Layer')
    console.log('📊 [GTM] Transaction ID:', orderData.orderId)
    console.log('💰 [GTM] Total:', orderData.total)
    console.log('🛒 [GTM] Items count:', orderData.items.length)
    console.log('📦 [GTM] Full ecommerce data:', ecommerceData)
    
    // Verificar que GTM esté presente
    if (!(window as any).google_tag_manager) {
      console.warn('⚠️ [GTM] Google Tag Manager no detectado en la página')
    } else {
      console.log('✅ [GTM] Google Tag Manager detectado y activo')
    }
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

/**
 * Inicializa el Data Layer en la página de Thank You
 * Debe llamarse antes que cualquier otro push al dataLayer
 */
export const initializeDataLayer = (orderID: string): void => {
  if (typeof window === 'undefined') return

  try {
    // Inicializar dataLayer con el orderID y variables básicas
    window.dataLayer = window.dataLayer || []
    
    // Push de variables iniciales para GTM
    window.dataLayer.push({
      // Información de la página
      event: 'page_view',
      orderID: orderID,
      pageCategory: 'nutricion',
      
      // URLs
      url: window.location.href,
      pageHostname: window.location.hostname,
      pagePath: window.location.pathname,
      pageURL: window.location.href,
      
      // Referrer
      referrer: document.referrer || 'https://tsgassistant.google.com/',
      
      // Número aleatorio para tracking único
      random: Math.floor(Math.random() * 1000000000)
    })

    console.log('✅ Data Layer initialized with orderID and page variables:', orderID)
  } catch (error) {
    console.error('❌ Error initializing Data Layer:', error)
  }
}

/**
 * Push de variables de producto al Data Layer
 * Útil para páginas de producto individual
 */
export const pushProductDataLayer = (productData: {
  productCategory?: string
  productCategoryC?: string
  productName?: string
  productNameC?: string
  productPrice?: number
  productPriceC?: number
  productQuantityC?: number
  productSKUC?: string
  productos?: number
}): void => {
  if (typeof window === 'undefined') return

  try {
    window.dataLayer = window.dataLayer || []
    
    const dataLayerVars: any = {}
    
    // Solo agregar campos que tengan valor
    if (productData.productCategory) dataLayerVars.productCategory = productData.productCategory
    if (productData.productCategoryC) dataLayerVars.productCategoryC = productData.productCategoryC
    if (productData.productName) dataLayerVars.productName = productData.productName
    if (productData.productNameC) dataLayerVars.productNameC = productData.productNameC
    if (productData.productPrice) dataLayerVars.productPrice = productData.productPrice
    if (productData.productPriceC) dataLayerVars.productPriceC = productData.productPriceC
    if (productData.productQuantityC) dataLayerVars.productQuantityC = productData.productQuantityC
    if (productData.productSKUC) dataLayerVars.productSKUC = productData.productSKUC
    if (productData.productos) dataLayerVars.productos = productData.productos
    
    window.dataLayer.push(dataLayerVars)
    
    console.log('✅ Product variables pushed to Data Layer')
  } catch (error) {
    console.error('❌ Error pushing product data to Data Layer:', error)
  }
}
