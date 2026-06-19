import { supabase } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import ReactMarkdown from "react-markdown"
import { ProductCard } from "@/components/product-card"

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
    .single()

  if (!blog) {
    notFound()
  }

  // Obtener blogs relacionados de la misma categoría
  const { data: relatedBlogs } = await supabase
    .from("blogs")
    .select("id, title, slug, cover_image, created_at")
    .eq("category_id", blog.category_id)
    .neq("id", blog.id)
    .order("created_at", { ascending: false })
    .limit(3)

  // Obtener productos destacados para la barra lateral
  const { data: sidebarProducts } = await supabase
    .from("products")
    .select(`
      id, name, slug, description, price, image, stock, category_id, created_at,
      rating, subscription_available, subscription_types, product_type
    `)
    .gt("stock", 0)
    .order("featured", { ascending: false })
    .limit(2)

  return (
    <div className="flex flex-col min-h-screen pt-20 bg-[linear-gradient(180deg,_#ffffff_0%,_#f7fafb_100%)]">
      <div className="responsive-section bg-transparent">
        <div className="responsive-container">
          <div className="mb-8">
            <Link href="/blog">
              <Button variant="ghost" className="pl-0 text-gray-700 hover:text-primary dark:text-gray-200">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al blog
              </Button>
            </Link>
          </div>

          {/* Grid Layout Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Columna Principal - Artículo */}
            <article className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-[#e6eeef] dark:border-gray-700">
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/70 mb-4">
                  <time dateTime={blog.created_at}>
                    {format(new Date(blog.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                  </time>
                  {blog.category && (
                    <>
                      <span>•</span>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                        {blog.category.name}
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#16313b] dark:text-white font-display leading-tight">
                  {blog.title}
                </h1>
                {blog.excerpt && (
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed font-medium">
                    {blog.excerpt}
                  </p>
                )}
                <div className="relative w-full h-[320px] md:h-[450px] rounded-2xl overflow-hidden shadow-sm">
                  <Image
                    src={blog.cover_image || "/placeholder.svg"}
                    alt={blog.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </header>

              <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-200 leading-relaxed">
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => <h1 className="text-3xl font-bold mt-10 mb-4 text-[#16313b] dark:text-white font-display" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-2xl font-bold mt-8 mb-4 text-[#16313b] dark:text-white font-display" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-xl font-bold mt-6 mb-3 text-[#16313b] dark:text-white font-display" {...props} />,
                    p: ({ ...props }) => <p className="mb-5 leading-relaxed text-gray-700 dark:text-gray-300" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc list-inside mb-5 pl-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal list-inside mb-5 pl-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                    blockquote: ({ ...props }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic my-6 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 py-3 pr-4 rounded-r-xl" {...props} />
                    ),
                    code: ({ inline, ...props }) =>
                      inline ? (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-primary" {...props} />
                      ) : (
                        <code
                          className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto font-mono text-primary"
                          {...props}
                        />
                      ),
                    a: ({ ...props }) => <a className="text-primary hover:underline font-semibold" {...props} />,
                  }}
                >
                  {blog.content || ""}
                </ReactMarkdown>
              </div>
            </article>

            {/* Columna Lateral - Sidebar */}
            <aside className="lg:col-span-4 space-y-8">
              <div className="lg:sticky lg:top-28 space-y-8">
                {/* Widget de Productos Recomendados */}
                {sidebarProducts && sidebarProducts.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-[#e6eeef] dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 text-[#16313b] dark:text-white font-display border-b border-gray-100 dark:border-gray-700 pb-3">
                      Productos Recomendados
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      {sidebarProducts.map((product) => (
                        <div key={product.id} className="h-[280px]">
                          <ProductCard
                            id={product.id}
                            name={product.name}
                            slug={product.slug}
                            description={product.description}
                            image={product.image}
                            price={product.price}
                            rating={product.rating}
                            product_type={product.product_type}
                            useShadow={false}
                            className="border border-gray-100 dark:border-gray-700 hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Widget de Categorías de la Tienda */}
                <div className="bg-[#eef7f8] dark:bg-gray-800/40 rounded-3xl p-6 border border-[#d2e7e9] dark:border-gray-700">
                  <h3 className="text-lg font-bold mb-3 text-[#16313b] dark:text-white font-display">
                    Nuestras Líneas
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                    Ofrecemos alimentación 100% natural, snacks y repostería artesanal de alta calidad para tu compañero.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { name: "🎂 Pasteles de cumpleaños", href: "/celebrar", color: "hover:bg-amber-100/40 hover:text-amber-900 border-amber-200/50 text-amber-800 dark:text-amber-200 bg-amber-500/5 dark:border-amber-900/30" },
                      { name: "💪 Alimentación diaria", href: "/complementar", color: "hover:bg-green-100/40 hover:text-green-900 border-green-200/50 text-green-800 dark:text-green-200 bg-green-500/5 dark:border-green-900/30" },
                      { name: "🏆 Snacks de premios", href: "/premiar", color: "hover:bg-blue-100/40 hover:text-blue-900 border-blue-200/50 text-blue-800 dark:text-blue-200 bg-blue-500/5 dark:border-blue-900/30" }
                    ].map((cat) => (
                      <Link
                        key={cat.name}
                        href={cat.href}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-semibold transition-all duration-300 ${cat.color} hover:translate-x-1`}
                      >
                        <span>{cat.name}</span>
                        <ArrowRight size={16} className="opacity-70" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Artículos Relacionados en la base */}
          {relatedBlogs && relatedBlogs.length > 0 && (
            <div className="mt-16 pt-12 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold mb-8 text-center text-[#16313b] dark:text-white font-display">
                Artículos relacionados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedBlogs.map((relatedBlog) => (
                  <div
                    key={relatedBlog.id}
                    className="bg-white/85 backdrop-blur-sm dark:bg-gray-800 dark:border-gray-700 border border-[#e6eeef] rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 group"
                  >
                    <Link href={`/blog/${relatedBlog.slug}`} className="relative h-48 block overflow-hidden">
                      <Image
                        src={relatedBlog.cover_image || "/placeholder.svg"}
                        alt={relatedBlog.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </Link>
                    <div className="p-6">
                      <p className="text-sm text-gray-500 dark:text-white/70 mb-2">
                        {format(new Date(relatedBlog.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      <Link href={`/blog/${relatedBlog.slug}`} className="block mb-4">
                        <h3 className="text-lg font-bold text-[#16313b] dark:text-white font-display hover:text-[#5faab3] transition-colors line-clamp-2 h-[56px] overflow-hidden leading-snug">
                          {relatedBlog.title}
                        </h3>
                      </Link>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full border-primary text-primary dark:border-white dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-gray-900"
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
