'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

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

    // Push de variables básicas disponibles en todas las páginas
    window.dataLayer.push({
      event: 'page_data_ready',
      pageCategory: pageCategory,
      pagePath: pathname,
      pageURL: window.location.href,
      pageHostname: window.location.hostname,
      url: window.location.href,
      referrer: document.referrer || '',
      random: Math.floor(Math.random() * 1000000000)
    })

    console.log('📊 Data Layer initialized for:', pathname, '| Category:', pageCategory)
  }, [pathname])

  return null // Este componente no renderiza nada
}
