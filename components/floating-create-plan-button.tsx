"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function FloatingCreatePlanButton() {
  // Obtener la ruta actual
  const pathname = usePathname()
  // Estado para controlar el montaje del componente
  const [mounted, setMounted] = useState(false)

  // Efecto para manejar el montaje del componente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Verificar si estamos en la página de creación del plan
  const isCreatingPlan = pathname === "/crear-plan"

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
            background: "linear-gradient(135deg, #7AB8BF 0%, #5a8f96 50%, #3a7a82 100%)",
            boxShadow: "0 4px 15px rgba(122, 184, 191, 0.5)",
          }}
          whileHover={{
            scale: 1.05,
            background: "linear-gradient(135deg, #8cc7ce 0%, #6ba1a8 50%, #4a8991 100%)",
            boxShadow: "0 6px 20px rgba(122, 184, 191, 0.6)",
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 4px 15px rgba(122, 184, 191, 0.3)",
              "0 4px 15px rgba(122, 184, 191, 0.7)",
              "0 4px 15px rgba(122, 184, 191, 0.3)",
            ],
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
          }}
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
          {!isCreatingPlan && (
            <motion.span
              initial={{ y: 0 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              Crea tu Plan
            </motion.span>
          )}
        </motion.button>
      </Link>
    </motion.div>
  )
}
