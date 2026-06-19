"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Definimos el tipo para el post para mayor claridad
type Post = {
  id: number
  title: string
  excerpt: string
  cover_image: string
  published_at: string
  slug: string
  category?: {
    name: string
  }
}

type BlogCardProps = {
  post: Post
}

export default function BlogCard({ post }: BlogCardProps) {
  const [imageSrc, setImageSrc] = useState(post.cover_image)

  const formatBlogDate = (dateString: string) => {
    try {
      // Usar la fecha proporcionada o la fecha actual como respaldo
      const date = dateString ? new Date(dateString) : new Date()
      return format(date, "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      // Si hay un error de formato, usar la fecha actual
      return format(new Date(), "d 'de' MMMM, yyyy", { locale: es })
    }
  }

  return (
    <div className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-[#7BBDC5] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 flex flex-col group h-full">
      <Link href={`/blog/${post.slug}`} className="relative h-48 block overflow-hidden">
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
          quality={85}
          onError={() => {
            // Si la imagen no se puede cargar, usamos el placeholder
            if (imageSrc !== "/placeholder.svg") {
              setImageSrc("/placeholder.svg")
            }
          }}
        />
        {post.category && (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-[#7BBDC5] text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
              {post.category.name}
            </span>
          </div>
        )}
      </Link>
      <div className="p-6 flex flex-col flex-grow">
        <p className="text-sm text-gray-500 dark:text-white/70 mb-2">{formatBlogDate(post.published_at)}</p>
        
        <Link href={`/blog/${post.slug}`} className="block mb-2">
          <h3 className="text-xl font-bold text-[#7BBDC5] dark:text-white font-display hover:text-[#5faab3] transition-colors duration-200 line-clamp-2 min-h-[3.5rem] max-h-[3.5rem] overflow-hidden leading-snug">
            {post.title}
          </h3>
        </Link>
        
        <Link href={`/blog/${post.slug}`} className="block mb-6 flex-grow">
          <p className="text-gray-600 dark:text-white/90 line-clamp-3 min-h-[4.5rem] max-h-[4.5rem] overflow-hidden leading-relaxed text-sm">
            {post.excerpt}
          </p>
        </Link>
        
        <Button
          asChild
          variant="outline"
          className="w-full rounded-full border-[#7BBDC5] text-[#7BBDC5] dark:border-white dark:text-white hover:bg-[#7BBDC5] hover:text-white dark:hover:bg-white dark:hover:text-[#7BBDC5] mt-auto font-medium shadow-sm"
        >
          <Link href={`/blog/${post.slug}`}>
            Leer más <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
