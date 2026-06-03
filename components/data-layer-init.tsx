'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createProductionSafeConsole } from '@/lib/debug'

const console = createProductionSafeConsole()

/**
 * Componente para inicializar variables globales del Data Layer en todas las páginas
 * Se debe incluir en el layout principal
 */
export function DataLayerInit() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Inicializar dataLayer si no existe
    window.dataLayer = window.dataLayer || []

    // Determinar la categoría de la página basándose en la ruta
    let pageCategory = 'general'
    if (pathname.includes('/nutricion')) pageCategory = 'nutricion'
    else if (pathname.includes('/productos')) pageCategory = 'productos'
    else if (pathname.includes('/suscripcion')) pageCategory = 'suscripcion'
    else if (pathname.includes('/gracias-por-tu-compra')) pageCategory = 'thankyou'
    else if (pathname.includes('/crear-plan')) pageCategory = 'crear-plan'
    else if (pathname.includes('/celebrar')) pageCategory = 'celebrar'
    else if (pathname.includes('/premiar')) pageCategory = 'premiar'
    else if (pathname.includes('/complementar')) pageCategory = 'complementar'

    // Para la página de Thank You, usar el evento gtm.load
    const eventName = pageCategory === 'thankyou' ? 'gtm.load' : 'page_data_ready'
    
    // Construir el objeto base
    const dataLayerEvent: any = {
      event: eventName,
      pageCategory: pageCategory,
      pagePath: pathname,
      pageURL: window.location.href,
      pageHostname: window.location.hostname,
      url: window.location.href,
      referrer: document.referrer || '',
      random: Math.floor(Math.random() * 1000000000)
    }
    
    // Si es Thank You, agregar el objeto gtm
    if (pageCategory === 'thankyou') {
      dataLayerEvent.gtm = {
        uniqueEventId: Math.floor(Math.random() * 1000),
        start: Date.now()
      }
    }

    // Push de variables básicas disponibles en todas las páginas
    window.dataLayer.push(dataLayerEvent)

    console.log('📊 Data Layer initialized for:', pathname, '| Category:', pageCategory, '| Event:', eventName)
    console.log('📊 Full dataLayer:', window.dataLayer)
  }, [pathname])

  return null // Este componente no renderiza nada
}
