import { supabase } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import ReactMarkdown from "react-markdown"

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: blog } = await supabase.from("blogs").select("title, excerpt").eq("slug", params.slug).single()

  if (!blog) {
    return {
      title: "Blog no encontrado",
      description: "El artículo que buscas no existe",
    }
  }

  return {
    title: `${blog.title} | Pet Gourmet Blog`,
    description: blog.excerpt,
  }
}

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const { data: blog } = await supabase
    .from("blogs")
    .select("*, category:category_id(name)")
    .eq("slug", params.slug)
    // Remove the is_published filter since the column doesn't exist
    .single()

  if (!blog) {
    notFound()
  }

  // Obtener blogs relacionados de la misma categoría
  const { data: relatedBlogs } = await supabase
    .from("blogs")
    .select("id, title, slug, cover_image, created_at")
    .eq("category_id", blog.category_id)
    // Remove the is_published filter since the column doesn't exist
    .neq("id", blog.id)
    .order("created_at", { ascending: false })
    .limit(3)

  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <div className="mb-8">
            <Link href="/blog">
              <Button variant="ghost" className="pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al blog
              </Button>
            </Link>
          </div>

          <article className="max-w-4xl mx-auto">
            <header className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <time dateTime={blog.created_at}>
                  {format(new Date(blog.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                </time>
                {blog.category && (
                  <>
                    <span>•</span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">{blog.category.name}</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">{blog.title}</h1>
              {blog.excerpt && <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">{blog.excerpt}</p>}
              <div className="relative w-full h-[400px] rounded-xl overflow-hidden">
                <Image
                  src={blog.cover_image || "/placeholder.svg"}
                  alt={blog.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </header>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
                  ),
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code
                        className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto"
                        {...props}
                      />
                    ),
                  a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
                }}
              >
                {blog.content || ""}
              </ReactMarkdown>
            </div>
          </article>

          {relatedBlogs && relatedBlogs.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-8 text-center">Artículos relacionados</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedBlogs.map((relatedBlog) => (
                  <div
                    key={relatedBlog.id}
                    className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="relative h-48">
                      <Image
                        src={relatedBlog.cover_image || "/placeholder.svg"}
                        alt={relatedBlog.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-500 dark:text-white/70 mb-2">
                        {format(new Date(relatedBlog.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      <h3 className="text-xl font-bold mb-4 text-primary dark:text-white font-display">
                        {relatedBlog.title}
                      </h3>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full border-primary text-primary dark:border-white dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-[#e7ae84]"
                      >
                        <Link href={`/blog/${relatedBlog.slug}`}>Leer más</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
