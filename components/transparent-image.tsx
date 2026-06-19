"use client"

import { useEffect, useRef, useState } from "react"

interface TransparentImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Elimina el fondo blanco/claro de una imagen en tiempo real usando:
 * 1. Flood-fill desde las 4 esquinas (como la varita mágica de Photoshop)
 * 2. Feathering de 1px en los bordes para anti-aliasing suave
 * Ventaja: no elimina blancos internos del ingrediente (ej. grasa de la carne)
 */
function floodFillTransparent(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 28
) {
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const colorMatch = (idx: number) => {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    return r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance
  }

  // Seeds: las 4 esquinas
  const seeds = [0, width - 1, (height - 1) * width, height * width - 1]
  for (const s of seeds) {
    if (!visited[s] && colorMatch(s * 4)) {
      queue.push(s)
      visited[s] = 1
    }
  }

  while (queue.length > 0) {
    const pos = queue.pop()!
    data[pos * 4 + 3] = 0 // alpha = 0

    const x = pos % width
    const y = Math.floor(pos / width)

    const neighbors = [
      y > 0 ? pos - width : -1,
      y < height - 1 ? pos + width : -1,
      x > 0 ? pos - 1 : -1,
      x < width - 1 ? pos + 1 : -1,
    ]

    for (const n of neighbors) {
      if (n >= 0 && !visited[n] && colorMatch(n * 4)) {
        visited[n] = 1
        queue.push(n)
      }
    }
  }

  // Feathering: suaviza 1px de borde (pixeles junto a transparentes)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // ya transparente
    const pos = i / 4
    const x = pos % width, y = Math.floor(pos / width)
    const neighbors = [
      y > 0 ? (pos - width) * 4 : -1,
      y < height - 1 ? (pos + width) * 4 : -1,
      x > 0 ? (pos - 1) * 4 : -1,
      x < width - 1 ? (pos + 1) * 4 : -1,
    ]
    const hasTransparentNeighbor = neighbors.some(n => n >= 0 && data[n + 3] === 0)
    if (hasTransparentNeighbor) {
      // suaviza reduciendo alpha según luminosidad
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
      const fade = Math.max(0, Math.min(255, (255 - lum) * 3))
      data[i + 3] = Math.min(data[i + 3], fade)
    }
  }
}

export function TransparentImage({
  src,
  alt,
  width,
  height,
  className,
  style,
}: TransparentImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!src) return
    setProcessedSrc("") // reset si cambia el src

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = src

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, w, h)

      floodFillTransparent(imageData.data, w, h, 28)

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
      loading="lazy"
      decoding="async"
    />
  )
}
