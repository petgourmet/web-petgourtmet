"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"

interface LazyVideoProps {
  poster: string
  srcWebm: string
  srcMp4: string
  aspectRatio?: string
  alt?: string
}

export function LazyVideo({
  poster,
  srcWebm,
  srcMp4,
  aspectRatio = "aspect-[16/9]",
  alt = "Video preview"
}: LazyVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (isPlaying) {
    return (
      <div className={`relative overflow-hidden rounded-[28px] ${aspectRatio} bg-[#11333a] w-full h-full`}>
        <video
          className="h-full w-full object-cover"
          controls
          autoPlay
          playsInline
        >
          <source src={srcWebm} type="video/webm" />
          <source src={srcMp4} type="video/mp4" />
        </video>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsPlaying(true)}
      className={`group relative overflow-hidden rounded-[28px] ${aspectRatio} bg-[#11333a] cursor-pointer w-full h-full`}
    >
      {/* Poster Image optimized via Next.js Image */}
      <Image
        src={poster}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 640px"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        priority={false}
      />
      
      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors duration-300" />

      {/* Centered Play Button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:shadow-white/20">
          <Play className="h-6 w-6 fill-primary ml-1 text-primary" />
        </div>
      </div>
    </div>
  )
}
