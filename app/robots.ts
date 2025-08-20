import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/checkout/',
          '/perfil/',
          '/processing-payment/',
          '/pago-pendiente/',
          '/error-pago/',
          '/gracias-por-tu-compra/',
          '/unauthorized/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/checkout/',
          '/perfil/',
          '/processing-payment/',
          '/pago-pendiente/',
          '/error-pago/',
          '/gracias-por-tu-compra/',
          '/unauthorized/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}