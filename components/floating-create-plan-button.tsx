"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function FloatingCreatePlanButton() {
  // Obtener la ruta actual
  const pathname = usePathname()
  // Obtener el tema actual
  const { theme, resolvedTheme } = useTheme()
  // Estado para controlar el montaje del componente
  const [mounted, setMounted] = useState(false)

  // Efecto para manejar el montaje del componente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Verificar si estamos en la página de creación del plan
  const isCreatingPlan = pathname === "/crear-plan"

  // Usar el tema resuelto para determinar el modo actual
  const currentTheme = mounted ? resolvedTheme : "light"
  const isDarkMode = currentTheme === "dark"

  // Definir colores según el tema
  const buttonColor = isDarkMode
    ? "rgba(140, 36, 43, 0.9)" // Rojo granate en modo oscuro
    : "rgba(231, 174, 132, 0.9)" // Melocotón en modo claro

  const buttonShadow = isDarkMode
    ? "0 4px 15px rgba(140, 36, 43, 0.4)" // Sombra roja en modo oscuro
    : "0 4px 15px rgba(231, 174, 132, 0.4)" // Sombra melocotón en modo claro

  const hoverColor = isDarkMode
    ? "#8c242b" // Hover rojo sólido en modo oscuro
    : "#e7ae84" // Hover melocotón sólido en modo claro

  // No renderizar nada hasta que el componente esté montado
  if (!mounted) return null

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Link href="/crear-plan">
        <motion.button
          className={`flex items-center justify-center gap-2 text-white ${isCreatingPlan ? "w-12 h-12" : "px-4 py-3"} rounded-full shadow-lg transition-all`}
          style={{
            backgroundColor: buttonColor,
            boxShadow: buttonShadow,
          }}
          whileHover={{
            scale: 1.05,
            backgroundColor: hoverColor,
          }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!isCreatingPlan && <span>Crea tu Plan</span>}
        </motion.button>
      </Link>
    </motion.div>
  )
}
