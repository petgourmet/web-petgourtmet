import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacto | Pet Gourmet',
  description: 'Ponte en contacto con Pet Gourmet. Escríbenos para resolver tus dudas sobre alimentación natural, pedidos, tiendas aliadas o suscripciones.',
  openGraph: {
    title: 'Contacto | Pet Gourmet',
    description: 'Ponte en contacto con Pet Gourmet. Escríbenos para resolver tus dudas.',
    url: '/contacto',
    type: 'website',
    images: [
      {
        url: '/og-contacto.png',
        width: 1200,
        height: 630,
        alt: 'Contacto Pet Gourmet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contacto | Pet Gourmet',
    description: 'Ponte en contacto con Pet Gourmet. Escríbenos para resolver tus dudas.',
    images: ['/og-contacto.png'],
  },
  alternates: {
    canonical: '/contacto',
  },
}

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
