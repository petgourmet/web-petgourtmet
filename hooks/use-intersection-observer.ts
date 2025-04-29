"use client"

import { useState, useEffect, useRef } from "react"

interface IntersectionObserverOptions {
  threshold?: number | number[]
  rootMargin?: string
  root?: Element | null
}

export function useIntersectionObserver(options: IntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<Element | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [options])

  return [ref, isIntersecting] as const
}
