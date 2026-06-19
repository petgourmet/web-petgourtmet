import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nutrición | Pet Gourmet',
  description: 'Conoce los principios de nutrición canina de Pet Gourmet. Descubre los beneficios de la alimentación natural, ingredientes de alta calidad y cómo alimentar a tu perro de forma saludable.',
  openGraph: {
    title: 'Nutrición | Pet Gourmet',
    description: 'Conoce los principios de nutrición canina y los beneficios de la alimentación natural con Pet Gourmet.',
    url: '/nutricion',
    type: 'website',
  },
  alternates: {
    canonical: '/nutricion',
  },
}

export default function NutricionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
