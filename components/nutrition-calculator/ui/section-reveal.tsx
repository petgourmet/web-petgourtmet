"use client"
// ============================================================
// UI – SectionReveal
//
// Combina dos comportamientos:
//   1. whileInView  → animación orgánica al hacer scroll manual
//   2. impulso suave → cuando `visible` pasa a true (el usuario
//      hizo una selección), un nudge lleva la nueva sección
//      al 25% superior del viewport — punto natural de lectura.
// ============================================================

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SectionRevealProps {
  visible: boolean
  children: React.ReactNode
  className?: string
}

// ─── Scroll custom ease-out-quart ─────────────────────────────
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4) }

function nudgeTo(targetY: number, duration = 620) {
  const startY   = window.scrollY
  const distance = targetY - startY
  if (Math.abs(distance) < 16) return          // ya está cerca, no mover
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min((now - t0) / duration, 1)
    window.scrollTo(0, startY + distance * easeOutQuart(p))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ─── Componente ───────────────────────────────────────────────
export function SectionReveal({ visible, children, className = "" }: SectionRevealProps) {
  const ref       = useRef<HTMLDivElement>(null)
  const wasHidden = useRef(!visible)

  useEffect(() => {
    // Solo actúa cuando la sección pasa de oculta → visible
    if (!visible || !wasHidden.current) {
      wasHidden.current = !visible
      return
    }
    wasHidden.current = false

    // Pequeño delay para que la animación de entrada empiece primero
    const timer = setTimeout(() => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const vh   = window.innerHeight

      // Solo empuja si la sección está en la mitad inferior del viewport
      // (si ya está visible en la parte superior, no molestar)
      if (rect.top < vh * 0.45) return

      // Target: dejar la parte superior de la sección en el 25% del viewport
      const targetY = window.scrollY + rect.top - vh * 0.25
      nudgeTo(targetY, 620)
    }, 280)

    return () => clearTimeout(timer)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          viewport={{ once: false, amount: 0.08 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
