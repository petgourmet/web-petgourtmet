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
      blogs: {
        Row: {
          id: number
          title: string
          slug: string
          content: string
          excerpt: string | null
          cover_image: string | null
          author_id: string | null
          published: boolean
          created_at: string
          updated_at: string
          category_id: number | null
          meta_description: string | null
          read_time: number | null
        }
        Insert: {
          id?: number
          title: string
          slug: string
          content: string
          excerpt?: string | null
          cover_image?: string | null
          author_id?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
          category_id?: number | null
          meta_description?: string | null
          read_time?: number | null
        }
        Update: {
          id?: number
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          cover_image?: string | null
          author_id?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
          category_id?: number | null
          meta_description?: string | null
          read_time?: number | null
        }
      }
      blog_categories: {
        Row: {
          id: number
          name: string
          slug: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
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
