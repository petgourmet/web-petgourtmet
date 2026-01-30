export type ProductType = 'simple' | 'variable'

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
  // Sistema de variantes
  product_type?: ProductType
  variants?: ProductVariant[]
  attributes?: ProductAttribute[]
  variant_count?: number
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
  author_id: string | null
  category_id: number | null
  published: boolean
  meta_description: string | null
  read_time: number
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

// ============================================
// SISTEMA DE VARIANTES
// ============================================

export type AttributeType = {
  id: number
  name: string                    // "size", "flavor", "color"
  display_name: string            // "Tamaño", "Sabor", "Color"
  input_type: 'select' | 'button' | 'color' | 'text' | 'number'
  is_system: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type ProductAttribute = {
  id: number
  product_id: number
  attribute_type_id: number
  attribute_type?: AttributeType  // Join para obtener detalles del tipo
  values: string[]                // ["500g", "1kg", "2kg"]
  is_required: boolean
  display_order: number
  created_at: string
}

export type ProductVariant = {
  id: number
  product_id: number
  sku?: string
  name: string                    // "1kg - Pollo"
  attributes: Record<string, string>  // { "size": "1kg", "flavor": "Pollo" }
  price: number
  compare_at_price?: number       // Precio antes de descuento
  stock: number
  track_inventory: boolean
  image?: string                  // Imagen específica de la variante
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
