"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface Props {
  children: React.ReactNode
}

const ClientLayout: React.FC<Props> = ({ children }) => {
  const [contentLoaded, setContentLoaded] = useState(false)

  useEffect(() => {
    setContentLoaded(true)
  }, [])

  useEffect(() => {
    // Función para guardar la posición de scroll
    const saveScrollPosition = () => {
      localStorage.setItem("scrollPosition", window.scrollY.toString())
    }

    // Función para restaurar la posición de scroll
    const restoreScrollPosition = () => {
      const savedPosition = localStorage.getItem("scrollPosition")
      if (savedPosition) {
        window.scrollTo(0, Number.parseInt(savedPosition))
      }
    }

    // Guardar posición al descargar o navegar a otra página
    window.addEventListener("beforeunload", saveScrollPosition)

    // Restaurar posición al cargar la página
    if (contentLoaded) {
      restoreScrollPosition()
    }

    return () => {
      window.removeEventListener("beforeunload", saveScrollPosition)
    }
  }, [contentLoaded])

  return <>{children}</>
}

export default ClientLayout
