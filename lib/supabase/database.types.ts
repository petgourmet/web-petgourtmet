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
          collection_id: string | null
          merchant_order_id: string | null
          external_reference: string | null
          payment_type: string | null
          payment_method: string | null
          site_id: string | null
          processing_mode: string | null
          merchant_account_id: string | null
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
          collection_id?: string | null
          merchant_order_id?: string | null
          external_reference?: string | null
          payment_type?: string | null
          payment_method?: string | null
          site_id?: string | null
          processing_mode?: string | null
          merchant_account_id?: string | null
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
          collection_id?: string | null
          merchant_order_id?: string | null
          external_reference?: string | null
          payment_type?: string | null
          payment_method?: string | null
          site_id?: string | null
          processing_mode?: string | null
          merchant_account_id?: string | null
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
      user_subscriptions: {
        Row: {
          id: number
          user_id: string
          product_id: number
          status: string
          frequency: string
          next_delivery: string
          created_at: string
          updated_at: string
          price: number
          quantity: number
          size: string | null
          paused_until: string | null
          mercadopago_subscription_id: string | null
          last_payment_date: string | null
          payment_method: string | null
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          status?: string
          frequency: string
          next_delivery: string
          created_at?: string
          updated_at?: string
          price: number
          quantity: number
          size?: string | null
          paused_until?: string | null
          mercadopago_subscription_id?: string | null
          last_payment_date?: string | null
          payment_method?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          status?: string
          frequency?: string
          next_delivery?: string
          created_at?: string
          updated_at?: string
          price?: number
          quantity?: number
          size?: string | null
          paused_until?: string | null
          mercadopago_subscription_id?: string | null
          last_payment_date?: string | null
          payment_method?: string | null
        }
      }
      pending_subscriptions: {
        Row: {
          id: number
          user_id: string
          product_id: number
          frequency: string
          quantity: number
          size: string | null
          price: number
          created_at: string
          mercadopago_preference_id: string | null
          status: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          frequency: string
          quantity: number
          size?: string | null
          price: number
          created_at?: string
          mercadopago_preference_id?: string | null
          status?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          frequency?: string
          quantity?: number
          size?: string | null
          price?: number
          created_at?: string
          mercadopago_preference_id?: string | null
          status?: string
        }
      }
      subscription_payments: {
        Row: {
          id: number
          subscription_id: number
          amount: number
          status: string
          payment_date: string
          mercadopago_payment_id: string | null
          created_at: string
          failure_reason: string | null
        }
        Insert: {
          id?: number
          subscription_id: number
          amount: number
          status: string
          payment_date: string
          mercadopago_payment_id?: string | null
          created_at?: string
          failure_reason?: string | null
        }
        Update: {
          id?: number
          subscription_id?: number
          amount?: number
          status?: string
          payment_date?: string
          mercadopago_payment_id?: string | null
          created_at?: string
          failure_reason?: string | null
        }
      }
      email_logs: {
        Row: {
          id: number
          user_id: string | null
          email_type: string
          recipient_email: string
          subject: string
          sent_at: string
          status: string
          error_message: string | null
          template_data: Json | null
        }
        Insert: {
          id?: number
          user_id?: string | null
          email_type: string
          recipient_email: string
          subject: string
          sent_at?: string
          status: string
          error_message?: string | null
          template_data?: Json | null
        }
        Update: {
          id?: number
          user_id?: string | null
          email_type?: string
          recipient_email?: string
          subject?: string
          sent_at?: string
          status?: string
          error_message?: string | null
          template_data?: Json | null
        }
      }
      mercadopago_webhooks: {
        Row: {
          id: number
          webhook_id: string
          event_type: string
          data_id: string
          processed: boolean
          created_at: string
          processed_at: string | null
          raw_data: Json
          error_message: string | null
        }
        Insert: {
          id?: number
          webhook_id: string
          event_type: string
          data_id: string
          processed?: boolean
          created_at?: string
          processed_at?: string | null
          raw_data: Json
          error_message?: string | null
        }
        Update: {
          id?: number
          webhook_id?: string
          event_type?: string
          data_id?: string
          processed?: boolean
          created_at?: string
          processed_at?: string | null
          raw_data?: Json
          error_message?: string | null
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
