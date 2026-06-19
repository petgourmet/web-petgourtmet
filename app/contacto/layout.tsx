import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacto | Pet Gourmet',
  description: 'Ponte en contacto con Pet Gourmet. Escríbenos para resolver tus dudas sobre alimentación natural, pedidos, tiendas aliadas o suscripciones.',
  openGraph: {
    title: 'Contacto | Pet Gourmet',
    description: 'Ponte en contacto con Pet Gourmet. Escríbenos para resolver tus dudas.',
    url: '/contacto',
    type: 'website',
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
