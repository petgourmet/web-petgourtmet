export type Product = {
  id: number
  name: string
  slug: string
  description: string
  price: number
  image: string
  category_id: number
  featured: boolean
  stock: number
  created_at: string
  updated_at: string
  nutritional_info?: string
  ingredients?: string
  rating?: number
  reviews_count?: number
}

export type Category = {
  id: number
  name: string
  slug: string
  description: string
  image: string
  color: string
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
