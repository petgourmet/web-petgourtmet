"use client"

import Script from "next/script"

const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "840370127164134"

// Declaración de tipos para Facebook Pixel
declare global {
  interface Window {
    fbq: (...args: any[]) => void
    _fbq: any
  }
}

export function FacebookPixel() {
  // Solo cargar en producción o si está explícitamente habilitado
  const isProduction = process.env.NODE_ENV === "production"
  const isEnabled = process.env.NEXT_PUBLIC_FB_PIXEL_ENABLED === "true" || isProduction

  if (!isEnabled || !FACEBOOK_PIXEL_ID) {
    return null
  }

  return (
    <>
      <Script 
        id="facebook-pixel" 
        strategy="afterInteractive"
        onError={(e) => {
          console.warn('Facebook Pixel failed to load:', e)
        }}
      >
        {`
          try {
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FACEBOOK_PIXEL_ID}');
            fbq('track', 'PageView');
          } catch (error) {
            console.warn('Facebook Pixel initialization error:', error);
          }
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
