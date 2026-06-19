import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alimentación Diaria | Pet Gourmet',
  description: 'Descubre nuestra línea de alimentación diaria natural para mascotas. Comida casera y recetas balanceadas para mantener a tu perro sano, activo y feliz.',
  openGraph: {
    title: 'Alimentación Diaria | Pet Gourmet',
    description: 'Comida casera y recetas balanceadas 100% naturales para la alimentación diaria de tu perro.',
    url: '/complementar',
    type: 'website',
  },
  alternates: {
    canonical: '/complementar',
  },
}

export default function ComplementarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
