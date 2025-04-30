import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export const revalidate = 3600 // Revalidar cada hora

export default async function BlogPage() {
  const { data: blogPosts, error } = await supabase
    .from("blogs")
    .select("*, category:category_id(name)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(6)

  if (error) {
    console.error("Error fetching blog posts:", error)
  }

  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Nuestro Blog</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-center mb-12">
            Artículos, consejos y recursos sobre nutrición, salud y bienestar para tu mascota.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {blogPosts && blogPosts.length > 0 ? (
              blogPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="relative h-48">
                    <Image
                      src={post.cover_image || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                    {post.category && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                          {post.category.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-500 dark:text-white/70 mb-2">
                      {format(new Date(post.published_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <h3 className="text-xl font-bold mb-2 text-primary dark:text-white font-display">{post.title}</h3>
                    <p className="text-gray-600 dark:text-white mb-4">{post.excerpt}</p>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full border-primary text-primary dark:border-white dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-[#e7ae84]"
                    >
                      <Link href={`/blog/${post.slug}`}>
                        Leer más <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No hay artículos disponibles en este momento.</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-lg shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 btn-glow font-display">
              Cargar más artículos
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
