export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
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
          nutritional_info: string | null
          ingredients: string | null
          rating: number | null
          reviews_count: number | null
        }
        Insert: {
          id?: number
          name: string
          slug: string
          description: string
          price: number
          image: string
          category_id: number
          featured?: boolean
          stock: number
          created_at?: string
          updated_at?: string
          nutritional_info?: string | null
          ingredients?: string | null
          rating?: number | null
          reviews_count?: number | null
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          description?: string
          price?: number
          image?: string
          category_id?: number
          featured?: boolean
          stock?: number
          created_at?: string
          updated_at?: string
          nutritional_info?: string | null
          ingredients?: string | null
          rating?: number | null
          reviews_count?: number | null
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          slug: string
          description: string
          image: string
          color: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          description: string
          image: string
          color: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          description?: string
          image?: string
          color?: string
        }
      }
      product_sizes: {
        Row: {
          id: number
          product_id: number
          weight: string
          price: number
          stock: number
        }
        Insert: {
          id?: number
          product_id: number
          weight: string
          price: number
          stock: number
        }
        Update: {
          id?: number
          product_id?: number
          weight?: string
          price?: number
          stock?: number
        }
      }
      product_images: {
        Row: {
          id: number
          product_id: number
          url: string
          alt: string
        }
        Insert: {
          id?: number
          product_id: number
          url: string
          alt: string
        }
        Update: {
          id?: number
          product_id?: number
          url?: string
          alt?: string
        }
      }
      orders: {
        Row: {
          id: number
          user_id: string | null
          status: string
          total: number
          created_at: string
          updated_at: string
          shipping_address: Json | null
          payment_intent_id: string | null
          payment_status: string | null
          order_number: string
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          shipping_method: string | null
          shipping_cost: number | null
          notes: string | null
          mercadopago_preference_id: string | null
          mercadopago_payment_id: string | null
        }
        Insert: {
          id?: number
          user_id?: string | null
          status?: string
          total: number
          created_at?: string
          updated_at?: string
          shipping_address?: Json | null
          payment_intent_id?: string | null
          payment_status?: string | null
          order_number: string
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          shipping_method?: string | null
          shipping_cost?: number | null
          notes?: string | null
          mercadopago_preference_id?: string | null
          mercadopago_payment_id?: string | null
        }
        Update: {
          id?: number
          user_id?: string | null
          status?: string
          total?: number
          created_at?: string
          updated_at?: string
          shipping_address?: Json | null
          payment_intent_id?: string | null
          payment_status?: string | null
          order_number?: string
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          shipping_method?: string | null
          shipping_cost?: number | null
          notes?: string | null
          mercadopago_preference_id?: string | null
          mercadopago_payment_id?: string | null
        }
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          product_id: number | null
          product_name: string
          product_image: string
          quantity: number
          price: number
          size: string | null
          is_subscription: boolean
        }
        Insert: {
          id?: number
          order_id: number
          product_id?: number | null
          product_name: string
          product_image: string
          quantity: number
          price: number
          size?: string | null
          is_subscription?: boolean
        }
        Update: {
          id?: number
          order_id?: number
          product_id?: number | null
          product_name?: string
          product_image?: string
          quantity?: number
          price?: number
          size?: string | null
          is_subscription?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
