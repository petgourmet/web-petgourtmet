import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Snacks y Premios | Pet Gourmet',
  description: 'Explora nuestra selección de snacks y premios deshidratados 100% naturales para perros. Premios deliciosos y saludables, libres de conservadores.',
  openGraph: {
    title: 'Snacks y Premios Naturales | Pet Gourmet',
    description: 'Premios y snacks saludables, 100% naturales y deshidratados para consentir a tu perro.',
    url: '/premiar',
    type: 'website',
    images: [
      {
        url: '/og-premiar.png',
        width: 1200,
        height: 630,
        alt: 'Snacks y Premios Pet Gourmet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snacks y Premios Naturales | Pet Gourmet',
    description: 'Premios y snacks saludables, 100% naturales y deshidratados para consentir a tu perro.',
    images: ['/og-premiar.png'],
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
