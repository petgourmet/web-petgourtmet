import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Productos - Alimentos Premium para Perros',
  description: 'Explora nuestra amplia gama de alimentos premium para perros. Comida natural, snacks saludables y premios nutritivos elaborados con ingredientes de alta calidad.',
  keywords: [
    'productos para perros',
    'alimentos premium mascotas',
    'comida natural perros',
    'snacks para perros',
    'premios caninos',
    'alimentación saludable',
    'nutrición canina',
    'pet gourmet productos',
    'comida casera perros',
    'alimento orgánico mascotas'
  ],
  openGraph: {
    title: 'Productos Pet Gourmet - Alimentos Premium para Perros',
    description: 'Explora nuestra amplia gama de alimentos premium para perros. Comida natural, snacks saludables y premios nutritivos.',
    type: 'website',
    url: '/productos',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Productos Pet Gourmet - Alimentos Premium para Perros',
    description: 'Explora nuestra amplia gama de alimentos premium para perros. Comida natural, snacks saludables y premios nutritivos.',
  },
  alternates: {
    canonical: '/productos',
  },
}

export default function ProductosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}