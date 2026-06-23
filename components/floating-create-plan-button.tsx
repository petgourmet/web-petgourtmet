"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function FloatingCreatePlanButton() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const onScroll = () => {
      try {
        setScrolled(window.scrollY > 120)
      } catch (err) {
        console.error('Error in scroll handler:', err)
      }
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      router.push("/crear-plan")
    } catch (err) {
      console.error('Error navigating to plan:', err)
      // Fallback: usar window.location si router falla
      window.location.href = "/crear-plan"
    }
  }

  // No renderizar en SSR ni en la propia página
  if (!mounted || pathname === "/crear-plan") return null

  return (
    <AnimatePresence>
      {scrolled && (
        <motion.div
          className="fixed bottom-6 right-5 z-50"
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <motion.button
            onClick={handleClick}
            aria-label="Crear plan de alimentación personalizado"
            className="flex items-center gap-2.5 px-4 py-3 rounded-full text-white font-semibold text-sm shadow-xl cursor-pointer select-none"
            style={{ background: "#2a7880" }}
            whileHover={{ scale: 1.06, background: "#1d636b" }}
            whileTap={{ scale: 0.96 }}
            animate={{
              boxShadow: [
                "0 4px 18px rgba(42,120,128,0.35)",
                "0 4px 24px rgba(42,120,128,0.65)",
                "0 4px 18px rgba(42,120,128,0.35)",
              ],
            }}
            transition={{
              boxShadow: {
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          >
            {/* Paw icon SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm10 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM4.5 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm15 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 10c2.5 0 5.5 2 5.5 5.5 0 2.5-1.5 4-3 4.5-.5.2-1.5.5-2.5.5s-2-.3-2.5-.5c-1.5-.5-3-2-3-4.5C6.5 12 9.5 10 12 10z"/>
            </svg>
            <span>Plan de tu perro</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FloatingCreatePlanButton
