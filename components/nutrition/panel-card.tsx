"use client"
import type React from "react"

import { clsx } from "clsx"
import type { PanelID } from "@/types/nutrition"

interface PanelCardProps {
  id: PanelID
  title: string
  description: string
  bgImage: string
  icon: React.ReactNode
  isActive: boolean
  onClick: (id: PanelID) => void
}

const cardClasses = {
  base: "group bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all duration-500 cursor-pointer relative overflow-hidden h-64 hover:h-[28rem]",
  hover: "hover:shadow-xl hover:scale-105",
}

const imageClasses = {
  container: "absolute inset-0 transition-all duration-500 ease-out group-hover:inset-0",
  overlay: "absolute inset-0 bg-black/20 group-hover:bg-black/40",
}

// Actualizar las clases de contenido para incluir la animación de abajo hacia arriba
const contentClasses = {
  container:
    "absolute inset-0 flex flex-col items-center justify-center text-center z-10 transition-all duration-500 opacity-0 transform translate-y-8 group-hover:opacity-100 group-hover:translate-y-0",
  iconWrapper: "hidden", // Ocultar el icono
  title: "text-xl font-bold mb-3 text-white drop-shadow-lg",
  description: "text-white/90 mb-4 drop-shadow",
  action: "text-sm text-white font-medium group-hover:underline group-hover:text-yellow-300 drop-shadow",
}

export function PanelCard({ id, title, description, bgImage, icon, isActive, onClick }: PanelCardProps) {
  return (
    <article
      className={clsx(cardClasses.base, cardClasses.hover)}
      onClick={() => onClick(id)}
      role="button"
      tabIndex={0}
      aria-label={`Ver preguntas sobre ${title.toLowerCase()}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(id)
        }
      }}
    >
      {/* Imagen de fondo */}
      <div className={imageClasses.container}>
        <img src={bgImage || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
        <div className={imageClasses.overlay} />
      </div>

      {/* Contenido de texto */}
      <div className={contentClasses.container}>
        <div className={contentClasses.iconWrapper}>{icon}</div>
        <p className={contentClasses.description}>{description}</p>
        <div className={contentClasses.action}>{isActive ? "Cerrar preguntas" : "Ver preguntas →"}</div>
      </div>
    </article>
  )
}
