export type Product = {
  id: number
  name: string
  slug: string
  description: string
  price: number
  image: string
  featured: boolean
  stock: number
  created_at: string
  updated_at: string
  nutritional_info?: string
  ingredients?: string
  rating?: number
  reviews_count?: number
  category_id?: number
  // Nuevos campos
  sale_type?: "unit" | "weight"
  weight_reference?: string
  subscription_available?: boolean
  subscription_types?: string[]
  // Descuentos por período configurables
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number
  // URLs de Mercado Pago por tipo de suscripción

  monthly_mercadopago_url?: string
  quarterly_mercadopago_url?: string
  annual_mercadopago_url?: string
}

export type Category = {
  id: number
  name: string
  slug: string
  description: string
  image: string
  color: string
}

export type ProductCategory = {
  id: number
  product_id: number
  category_id: number
}

export type ProductSize = {
  id: number
  product_id: number
  weight: string
  price: number
  stock: number
}

export type ProductImage = {
  id: number
  product_id: number
  url: string
  alt: string
  display_order?: number
}

export type ProductFeature = {
  id?: number
  product_id?: number
  name: string
  color: string
}

export type ProductReview = {
  id?: number
  product_id: number
  user_id?: string
  user_name?: string
  rating: number
  comment?: string
  verified?: boolean
  featured?: boolean
  created_at?: string
}

export type User = {
  id: string
  email: string
  role: "admin" | "user"
  created_at: string
}

export type Blog = {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string
  published_at: string
  updated_at: string
  author: string | null
  category_id: number | null
  is_published: boolean
  category?: {
    name: string
  }
}

export type BlogCategory = {
  id: number
  name: string
  slug: string
}

// Nuevos tipos para configuración de suscripciones
export type SubscriptionConfig = {
  id: number
  period: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual"
  discount_percentage: number
  is_active: boolean
  mercadopago_url?: string
  created_at: string
  updated_at: string
}
