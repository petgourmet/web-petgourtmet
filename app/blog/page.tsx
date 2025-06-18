import { supabase } from "@/lib/supabase/client"
import BlogCard from "@/components/blog-card"

export const revalidate = 3600 // Revalidar cada hora

// Datos de ejemplo para cuando no hay conexión a Supabase
const fallbackBlogPosts = [
  {
    id: 1,
    title: "La importancia de la proteína en la dieta de tu perro",
    excerpt: "Descubre por qué la proteína de alta calidad es esencial para la salud y el bienestar de tu mascota.",
    cover_image: "/natural-dog-food-ingredients.png",
    published_at: new Date().toISOString(),
    category: { name: "Nutrición" },
    slug: "importancia-proteina-dieta-perro",
  },
  {
    id: 2,
    title: "Cómo reconocer si tu perro tiene alergias alimentarias",
    excerpt: "Aprende a identificar los signos de alergias alimentarias y cómo adaptar la dieta de tu mascota.",
    cover_image: "/happy-labrador-walk.png",
    published_at: new Date().toISOString(),
    category: { name: "Salud" },
    slug: "reconocer-alergias-alimentarias-perro",
  },
  {
    id: 3,
    title: "Snacks saludables que puedes preparar en casa",
    excerpt: "Recetas fáciles y nutritivas para premiar a tu perro sin comprometer su salud.",
    cover_image: "/healthy-dog-training-treats.png",
    published_at: new Date().toISOString(),
    category: { name: "Recetas" },
    slug: "snacks-saludables-caseros-perro",
  },
  {
    id: 4,
    title: "La transición a una alimentación natural: guía paso a paso",
    excerpt: "Cómo cambiar gradualmente la dieta de tu perro a una alimentación más natural y saludable.",
    cover_image: "/dog-eating-treat.png",
    published_at: new Date().toISOString(),
    category: { name: "Guías" },
    slug: "transicion-alimentacion-natural-guia",
  },
  {
    id: 5,
    title: "Nutrición específica para perros senior",
    excerpt: "Consejos para adaptar la alimentación de tu perro a medida que envejece y sus necesidades cambian.",
    cover_image: "/joyful-dog-owner.png",
    published_at: new Date().toISOString(),
    category: { name: "Nutrición" },
    slug: "nutricion-especifica-perros-senior",
  },
  {
    id: 6,
    title: "Mitos y verdades sobre la alimentación canina",
    excerpt: "Desmontamos creencias populares y aclaramos dudas comunes sobre la nutrición de los perros.",
    cover_image: "/woman-and-golden-retriever-park.png",
    published_at: new Date().toISOString(),
    category: { name: "Educación" },
    slug: "mitos-verdades-alimentacion-canina",
  },
]

export default async function BlogPage() {
  let blogPosts = []
  let error = null

  try {
    // Intentar obtener datos de Supabase sin filtrar por is_published
    const response = await supabase.from("blogs").select("*, category:category_id(name)").limit(6)

    // Verificar si hay errores en la respuesta
    if (response.error) {
      console.error("Error fetching blog posts:", response.error)
      error = response.error
      blogPosts = fallbackBlogPosts
    } else {
      // Si hay datos, usarlos; de lo contrario, usar los datos de ejemplo
      blogPosts = response.data && response.data.length > 0 ? response.data : fallbackBlogPosts
    }
  } catch (err) {
    console.error("Error en la conexión con Supabase:", err)
    error = err
    blogPosts = fallbackBlogPosts
  }

  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white dark:bg-gray-900">
        <div className="responsive-container">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Nuestro Blog</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-center mb-12">
            Artículos, consejos y recursos sobre nutrición, salud y bienestar para tu mascota.
          </p>

          {error && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    Mostrando contenido de ejemplo. La conexión a la base de datos no está disponible en este momento.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* El botón "Cargar más artículos" ha sido eliminado */}
          {/* 
          <div className="text-center">
            <Button className="bg-[#7BBDC5] hover:bg-[#7BBDC5]/90 text-white rounded-full px-8 py-6 text-lg shadow-md hover:shadow-lg hover:shadow-[#7BBDC5]/20 transition-all duration-300 btn-glow font-display">
              Cargar más artículos
            </Button>
          </div> 
          */}
        </div>
      </div>
    </div>
  )
}
