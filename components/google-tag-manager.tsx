'use client'

import Script from 'next/script'

export function GoogleTagManager() {
  return (
    <>
      {/*
       * Partytown config: DEBE ejecutarse ANTES de que Partytown arranque.
       * · forward: funciones del hilo principal que Partytown intercepta y
       *   reenvia al Web Worker donde vive GTM.
       * · Sin esto, los pushes a dataLayer desde React no llegarían a GTM.
       */}
      <Script
        id="partytown-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.partytown = {
  forward: ['dataLayer.push', 'gtag', 'fbq'],
  resolveUrl: function(url) {
    var proxyHosts = [
      'www.googletagmanager.com',
      'connect.facebook.net',
      'www.google-analytics.com',
    ];
    if (proxyHosts.some(function(h){ return url.hostname === h; })) {
      var proxy = new URL('https://petgourmet.mx/~partytown-proxy');
      proxy.searchParams.append('url', url.href);
      return proxy;
    }
    return url;
  },
};`,
        }}
      />

      {/* GTM corre DENTRO de un Web Worker — hilo principal 100% libre */}
      <Script
        id="gtm-script"
        strategy="worker"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-WMCL7Z6H');
          `,
        }}
      />
    </>
  )
}

export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=GTM-WMCL7Z6H"
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  )
}