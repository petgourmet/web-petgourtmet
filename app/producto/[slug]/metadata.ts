import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase/client'

interface Props {
  params: { slug: string }
  searchParams: { id?: string }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const productId = searchParams.id
  
  if (!productId) {
    return {
      title: 'Producto no encontrado | Pet Gourmet',
      description: 'El producto solicitado no fue encontrado.',
    }
  }

  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', productId)
      .single()

    if (error || !product) {
      return {
        title: 'Producto no encontrado | Pet Gourmet',
        description: 'El producto solicitado no fue encontrado.',
      }
    }

    // Construir URL de imagen
    let imageUrl = product.image
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      const { data } = supabase.storage.from('products').getPublicUrl(imageUrl)
      imageUrl = data.publicUrl
    }

    const title = `${product.name} | Pet Gourmet`
    const description = product.description || `Descubre ${product.name}, alimento premium para perros de Pet Gourmet. Ingredientes naturales y nutritivos para la salud de tu mascota.`
    const category = product.categories?.name || 'Alimentos para mascotas'
    
    return {
      title,
      description,
      keywords: [
        product.name,
        'pet gourmet',
        'alimento para perros',
        'comida premium mascotas',
        category.toLowerCase(),
        'alimentación natural',
        'snacks para perros',
        'premios para mascotas',
        'comida casera para perros',
        'nutrición canina'
      ],
      openGraph: {
        title,
        description,
        type: 'product',
        url: `/producto/${params.slug}?id=${productId}`,
        siteName: 'Pet Gourmet',
        images: imageUrl ? [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: product.name,
          }
        ] : [],
        locale: 'es_MX',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
      alternates: {
        canonical: `/producto/${params.slug}?id=${productId}`,
      },
      other: {
        'product:price:amount': product.price?.toString() || '0',
        'product:price:currency': 'MXN',
        'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
        'product:category': category,
        'product:brand': 'Pet Gourmet',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Pet Gourmet - Alimento Premium para Perros',
      description: 'Descubre nuestra gama de alimentos naturales y nutritivos para perros.',
    }
  }
}