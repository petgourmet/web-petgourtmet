'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

interface StructuredDataProps {
  type?: 'website' | 'product' | 'organization' | 'breadcrumb'
  data?: any
}

export function StructuredData({ type = 'website', data }: StructuredDataProps) {
  const pathname = usePathname()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'

  const getStructuredData = () => {
    const baseData = {
      '@context': 'https://schema.org',
    }

    switch (type) {
      case 'organization':
        return {
          ...baseData,
          '@type': 'Organization',
          name: 'Pet Gourmet',
          url: baseUrl,
          logo: `${baseUrl}/petgourmet-logo.png`,
          description: 'Alimentos premium y naturales para perros. Comida casera, snacks y premios 100% naturales.',
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+52-55-1234-5678',
            contactType: 'customer service',
            availableLanguage: 'Spanish'
          },
          sameAs: [
            'https://www.facebook.com/petgourmet',
            'https://www.instagram.com/petgourmet',
            'https://twitter.com/petgourmet'
          ],
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'MX',
            addressLocality: 'Ciudad de México'
          }
        }

      case 'product':
        if (!data) return null
        return {
          ...baseData,
          '@type': 'Product',
          name: data.name,
          description: data.description,
          image: data.image,
          brand: {
            '@type': 'Brand',
            name: 'Pet Gourmet'
          },
          offers: {
            '@type': 'Offer',
            price: data.price,
            priceCurrency: 'MXN',
            availability: data.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'Pet Gourmet'
            }
          },
          category: data.category,
          sku: data.id,
          aggregateRating: data.rating ? {
            '@type': 'AggregateRating',
            ratingValue: data.rating,
            reviewCount: data.reviewCount || 1
          } : undefined
        }

      case 'breadcrumb':
        const pathSegments = pathname.split('/').filter(Boolean)
        const breadcrumbItems = pathSegments.map((segment, index) => {
          const url = `${baseUrl}/${pathSegments.slice(0, index + 1).join('/')}`
          const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
          
          return {
            '@type': 'ListItem',
            position: index + 2, // +2 because home is position 1
            name,
            item: url
          }
        })

        return {
          ...baseData,
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Inicio',
              item: baseUrl
            },
            ...breadcrumbItems
          ]
        }

      case 'website':
      default:
        return {
          ...baseData,
          '@type': 'WebSite',
          name: 'Pet Gourmet',
          url: baseUrl,
          description: 'Alimentos premium y naturales para perros. Comida casera, snacks y premios 100% naturales.',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/productos?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          },
          publisher: {
            '@type': 'Organization',
            name: 'Pet Gourmet',
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/petgourmet-logo.png`
            }
          }
        }
    }
  }

  const structuredData = getStructuredData()

  if (!structuredData) return null

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}