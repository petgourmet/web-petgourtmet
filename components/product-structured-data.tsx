'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import type { Product } from '@/components/product-category-loader'

interface ProductStructuredDataProps {
  product: Product
}

export function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: 'Pet Gourmet',
      logo: `${baseUrl}/petgourmet-logo.png`
    },
    manufacturer: {
      '@type': 'Organization',
      name: 'Pet Gourmet',
      url: baseUrl
    },
    offers: product.sizes?.map(size => ({
      '@type': 'Offer',
      price: size.price,
      priceCurrency: 'MXN',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Pet Gourmet'
      },
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 año
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'MXN'
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY'
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'DAY'
          }
        }
      },
      additionalProperty: {
        '@type': 'PropertyValue',
        name: 'Peso',
        value: size.weight
      }
    })) || [{
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'MXN',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Pet Gourmet'
      },
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition'
    }],
    category: product.category,
    sku: product.id,
    gtin: product.id, // Usar ID como GTIN temporal
    additionalProperty: [
      ...(product.features?.map(feature => ({
        '@type': 'PropertyValue',
        name: feature.name,
        value: true
      })) || []),
      {
        '@type': 'PropertyValue',
        name: 'Tipo de Mascota',
        value: 'Perro'
      },
      {
        '@type': 'PropertyValue',
        name: 'Tipo de Alimento',
        value: 'Premium Natural'
      }
    ],
    audience: {
      '@type': 'PeopleAudience',
      suggestedMinAge: 18
    },
    isRelatedTo: {
      '@type': 'Product',
      name: 'Alimentos para Mascotas',
      category: 'Pet Food'
    },
    ...(product.nutritional_info && {
      nutrition: {
        '@type': 'NutritionInformation',
        calories: product.nutritional_info.calories || undefined,
        proteinContent: product.nutritional_info.protein || undefined,
        fatContent: product.nutritional_info.fat || undefined,
        carbohydrateContent: product.nutritional_info.carbohydrates || undefined,
        fiberContent: product.nutritional_info.fiber || undefined
      }
    })
  }

  return (
    <Script
      id="product-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}