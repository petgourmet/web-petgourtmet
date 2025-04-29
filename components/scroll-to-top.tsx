"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Cuando cambia la ruta, hacer scroll al inicio de la página
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // Usar "instant" en lugar de "smooth" para un desplazamiento inmediato
    })
  }, [pathname])

  return null // Este componente no renderiza nada visible
}
