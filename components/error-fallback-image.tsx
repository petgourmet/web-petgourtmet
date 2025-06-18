"use client"

import type React from "react"

import Image, { type ImageProps } from "next/image"
import { useState, useEffect } from "react"

interface ErrorFallbackImageProps extends ImageProps {
  fallbackSrc?: string
}

export function ErrorFallbackImage({
  src,
  fallbackSrc = "/placeholder.svg?width=400&height=300",
  onError,
  ...props
}: ErrorFallbackImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [error, setError] = useState(false)

  useEffect(() => {
    setCurrentSrc(src) // Reset src if props.src changes
    setError(false) // Reset error state if props.src changes
  }, [src])

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!error) {
      // Prevent infinite loop if fallback also fails, though unlikely for placeholder
      setCurrentSrc(fallbackSrc)
      setError(true)
    }
    if (onError) {
      onError(e)
    }
  }

  return <Image {...props} src={currentSrc || "/placeholder.svg"} onError={handleError} />
}
