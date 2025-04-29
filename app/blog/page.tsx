import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const blogPosts = [
  {
    id: 1,
    title: "La importancia de la proteína en la dieta de tu perro",
    excerpt: "Descubre por qué la proteína de alta calidad es esencial para la salud y el bienestar de tu mascota.",
    image: "/natural-dog-food-ingredients.png",
    date: "15 de abril, 2023",
    category: "Nutrición",
    slug: "importancia-proteina-dieta-perro",
  },
  {
    id: 2,
    title: "Cómo reconocer si tu perro tiene alergias alimentarias",
    excerpt: "Aprende a identificar los signos de alergias alimentarias y cómo adaptar la dieta de tu mascota.",
    image: "/happy-labrador-walk.png",
    date: "3 de marzo, 2023",
    category: "Salud",
    slug: "reconocer-alergias-alimentarias-perro",
  },
  {
    id: 3,
    title: "Snacks saludables que puedes preparar en casa",
    excerpt: "Recetas fáciles y nutritivas para premiar a tu perro sin comprometer su salud.",
    image: "/healthy-dog-training-treats.png",
    date: "22 de febrero, 2023",
    category: "Recetas",
    slug: "snacks-saludables-caseros-perro",
  },
  {
    id: 4,
    title: "La transición a una alimentación natural: guía paso a paso",
    excerpt: "Cómo cambiar gradualmente la dieta de tu perro a una alimentación más natural y saludable.",
    image: "/dog-eating-treat.png",
    date: "10 de enero, 2023",
    category: "Guías",
    slug: "transicion-alimentacion-natural-guia",
  },
  {
    id: 5,
    title: "Nutrición específica para perros senior",
    excerpt: "Consejos para adaptar la alimentación de tu perro a medida que envejece y sus necesidades cambian.",
    image: "/joyful-dog-owner.png",
    date: "5 de diciembre, 2022",
    category: "Nutrición",
    slug: "nutricion-especifica-perros-senior",
  },
  {
    id: 6,
    title: "Mitos y verdades sobre la alimentación canina",
    excerpt: "Desmontamos creencias populares y aclaramos dudas comunes sobre la nutrición de los perros.",
    image: "/woman-and-golden-retriever-park.png",
    date: "18 de noviembre, 2022",
    category: "Educación",
    slug: "mitos-verdades-alimentacion-canina",
  },
]

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-illuminated">
        <div className="responsive-container">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Nuestro Blog</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-center mb-12">
            Artículos, consejos y recursos sobre nutrición, salud y bienestar para tu mascota.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {blogPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative h-48">
                  <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-500 dark:text-white/70 mb-2">{post.date}</p>
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
            ))}
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
