import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pasteles de Cumpleaños | Pet Gourmet',
  description: 'Descubre nuestros pasteles de cumpleaños 100% naturales para perros y gatos. Celebra el día especial de tu mascota con ingredientes saludables y seguros.',
  openGraph: {
    title: 'Pasteles de Cumpleaños | Pet Gourmet',
    description: 'Celebra a tu mascota con nuestros deliciosos pasteles de cumpleaños 100% naturales.',
    url: '/celebrar',
    type: 'website',
    images: [
      {
        url: '/og-celebrar.png',
        width: 1200,
        height: 630,
        alt: 'Pasteles de Cumpleaños Pet Gourmet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pasteles de Cumpleaños | Pet Gourmet',
    description: 'Celebra a tu mascota con nuestros deliciosos pasteles de cumpleaños 100% naturales.',
    images: ['/og-celebrar.png'],
  },
  alternates: {
    canonical: '/celebrar',
  },
}

export default function CelebrarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
