import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Gracias por tu Compra',
  description: 'Tu pedido ha sido confirmado exitosamente',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ThankYouLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* 
        Script crítico: debe ejecutarse ANTES de GTM
        Este script se ejecuta de forma síncrona en el <head> antes que cualquier otro script
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Asegurar que dataLayer existe
            window.dataLayer = window.dataLayer || [];
            
            // Push INMEDIATO de las variables de Thank You page
            window.dataLayer.push({
              event: 'gtm.load',
              gtm: {
                uniqueEventId: Math.floor(Math.random() * 1000),
                start: Date.now()
              },
              pageCategory: 'thankyou',
              pagePath: '/gracias-por-tu-compra',
              pageURL: window.location.href,
              pageHostname: window.location.hostname,
              url: window.location.href,
              referrer: document.referrer || '',
              random: Math.floor(Math.random() * 1000000000)
            });
            
            console.log('✅ [GTM] Thank You variables pushed BEFORE GTM loads');
          `,
        }}
      />
      {children}
    </>
  )
}
