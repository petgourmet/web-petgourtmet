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
    } catch (e) {
      // Si hay un error de formato, usar la fecha actual
      return format(new Date(), "d 'de' MMMM, yyyy", { locale: es })
    }
  }

  return (
    <div className="bg-white shadow-md dark:bg-[#7BBDC5] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
      <div className="relative h-48">
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt={post.title}
          fill
          className="object-cover"
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
          <div className="absolute top-4 left-4">
            <span className="bg-[#7BBDC5] text-white px-3 py-1 rounded-full text-xs font-medium">
              {post.category.name}
            </span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <p className="text-sm text-gray-500 dark:text-white/70 mb-2">{formatBlogDate(post.published_at)}</p>
        <h3 className="text-xl font-bold mb-2 text-[#7BBDC5] dark:text-white font-display">{post.title}</h3>
        <p className="text-gray-600 dark:text-white mb-4 flex-grow">{post.excerpt}</p>
        <Button
          asChild
          variant="outline"
          className="w-full rounded-full border-[#7BBDC5] text-[#7BBDC5] dark:border-white dark:text-white hover:bg-[#7BBDC5] hover:text-white dark:hover:bg-white dark:hover:text-[#7BBDC5] mt-auto"
        >
          <Link href={`/blog/${post.slug}`}>
            Leer más <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
