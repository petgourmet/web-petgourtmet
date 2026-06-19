"use client"

import { useEffect, useState } from "react"

interface TransparentImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  style?: React.CSSProperties
}

export function TransparentImage({ src, alt, width, height, className, style }: TransparentImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string>("")

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = src
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Loop through all pixels (4 bytes per pixel: R, G, B, A)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // If the pixel is very close to white (RGB > 240), make it transparent
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0 // Set alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0)
      setProcessedSrc(canvas.toDataURL("image/png"))
    }
  }, [src])

  if (!processedSrc) {
    return (
      <div 
        className={className} 
        style={{ ...style, width: `${width}px`, height: `${height}px`, opacity: 0 }} 
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={processedSrc} 
      alt={alt} 
      width={width} 
      height={height} 
      className={className} 
      style={style} 
    />
  )
}
