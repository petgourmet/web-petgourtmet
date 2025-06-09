import type React from "react"
import type { LucideIcon } from "lucide-react"

export interface FAQ {
  question: string
  answer: string
}

export interface Benefit {
  icon: LucideIcon
  title: string
  description: string
}

export interface FoodToAvoid {
  name: string
  reason: string
}

export interface Testimonial {
  name: string
  pet: string
  comment: string
  avatar: string
}

export type PanelID = "productos" | "envios" | "alimentos"

export interface PanelData {
  id: PanelID
  title: string
  description: string
  bgImage: string
  icon: React.ReactNode
}
