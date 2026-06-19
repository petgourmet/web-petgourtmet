import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Snacks y Premios | Pet Gourmet',
  description: 'Explora nuestra selección de snacks y premios deshidratados 100% naturales para perros. Premios deliciosos y saludables, libres de conservadores.',
  openGraph: {
    title: 'Snacks y Premios Naturales | Pet Gourmet',
    description: 'Premios y snacks saludables, 100% naturales y deshidratados para consentir a tu perro.',
    url: '/premiar',
    type: 'website',
  },
  alternates: {
    canonical: '/premiar',
  },
}

export default function PremiarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
