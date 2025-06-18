import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { VideoHero } from "@/components/video-hero"
import "../app/reset.css"

export default function Home() {
  return (
    <div
      className="flex flex-col min-h-screen bg-white overflow-x-hidden"
      style={{ margin: 0, padding: 0, maxWidth: "100vw", width: "100vw" }}
    >
      {/* Hero Section */}
      <VideoHero />

      {/* Nutrition Categories Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 font-display">Nutrición Premium</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Cada receta está cuidadosamente formulada por expertos veterinarios para satisfacer las necesidades
              específicas de tu mascota.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              {
                title: "Nuestras Recetas",
                description: "Formulaciones exclusivas para una nutrición completa",
                gradientFrom: "from-orange-400",
                gradientTo: "to-orange-600",
                icon: "🍲",
                image:
                  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nuestras%20recetas-hcHtwjxfVN0K9uRVXtR1trM0gOZRDf.webp",
                href: "/productos",
              },
              {
                title: "Para Celebrar",
                description: "Productos especiales para momentos únicos",
                gradientFrom: "from-amber-400",
                gradientTo: "to-amber-600",
                icon: "🎂",
                image:
                  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20celebrar-SjhsRPMm1PELsrFBBIw2vtSIK9AzeV.webp",
                href: "/celebrar",
              },
              {
                title: "Para Complementar",
                description: "Refuerza la salud y bienestar diario",
                gradientFrom: "from-emerald-400",
                gradientTo: "to-emerald-600",
                icon: "🌿",
                image: "/complementar-dog-treat.webp",
                href: "/complementar",
              },
              {
                title: "Para Premiar",
                description: "Golosinas saludables y nutritivas",
                gradientFrom: "from-sky-400",
                gradientTo: "to-sky-600",
                icon: "🦴",
                image:
                  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20premiar-3zEy8fX4CSDDrmAnYIJpl2cV1t26l3.webp",
                href: "/premiar",
              },
            ].map((category, index) => (
              <Link
                href={category.href}
                key={index}
                className="group relative overflow-hidden rounded-2xl shadow-xl transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105 hover:z-10 h-[400px] flex flex-col cursor-pointer"
              >
                <div className="absolute inset-0 w-full h-full">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo} opacity-30 group-hover:opacity-50 group-hover:shadow-2xl transition-all duration-500`}
                  ></div>

                  {/* Capa para imágenes */}
                  <div className="absolute inset-0 w-full h-full opacity-100 group-hover:brightness-110 group-hover:contrast-110 transition-all duration-500">
                    <Image
                      src={category.image || "/placeholder.svg"}
                      alt={category.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>

                  {/* Elementos decorativos */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none"></div>
                  <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-white/10 rounded-full pointer-events-none"></div>
                  <div className="absolute bottom-1/3 left-1/2 w-12 h-12 bg-white/10 rounded-full pointer-events-none"></div>
                </div>

                {/* Panel translúcido que se expande desde abajo */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm rounded-b-2xl transition-all duration-500 ease-in-out h-16 group-hover:h-48 overflow-hidden">
                  <div className="p-4 h-full flex flex-col justify-between">
                    <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      <p className="text-white/90 mb-2">{category.description}</p>
                      <span className="inline-flex items-center text-sm font-semibold text-white">
                        Descubrir <ArrowRight className="ml-2 w-4 h-4 group-hover:ml-3 transition-all" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 relative overflow-hidden bg-white">
        <div className="container relative z-10 mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 order-2 lg:order-1">
              <div className="bg-white p-8 rounded-3xl shadow-xl relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:bg-gray-50 hover:transform hover:scale-[1.02]">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] transition-all duration-500 group-hover:bg-primary/10 group-hover:w-40 group-hover:h-40 group-hover:rounded-bl-[120px]"></div>

                <div className="relative z-10">
                  <div className="inline-block bg-primary/10 rounded-full px-4 py-1 text-primary text-sm font-medium mb-6">
                    Calidad Premium
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 font-display leading-tight">
                    Ingredientes <span className="text-primary">Premium</span> para tu Mejor Amigo
                  </h2>
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    Nos comprometemos a utilizar sólo los ingredientes más frescos y de mayor calidad en cada receta,
                    garantizando la salud y felicidad de tu mascota en cada bocado.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {[
                      {
                        title: "100% Natural",
                        description: "Ingredientes frescos y naturales sin procesamiento excesivo",
                      },
                      {
                        title: "Sin Aditivos",
                        description: "Libre de conservantes y aditivos artificiales dañinos",
                      },
                      {
                        title: "Formulación Experta",
                        description: "Desarrollado por veterinarios especialistas en nutrición",
                      },
                      {
                        title: "Beneficios Comprobados",
                        description: "Mejora visible en salud, energía y bienestar general",
                      },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <div className="mr-4 bg-primary/10 rounded-full p-2 text-primary mt-1">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    className="rounded-xl bg-primary hover:bg-primary/90 text-white px-8 py-4 h-auto text-lg font-semibold transition-all duration-300 hover:shadow-lg"
                  >
                    <Link href="/productos" className="flex items-center">
                      Ver Todos los Productos
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 order-1 lg:order-2">
              <div className="relative">
                {/* Main image with decorative elements */}
                <div className="relative z-20 rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/HERO-vDqIBaCFtETXEYMwu8oZS3EIpZSIcU.webp"
                    alt="Galletas naturales para perros con ingredientes premium"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-900">
                    Ingredientes de primera calidad
                  </div>
                </div>

                {/* Background decorative circles */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full filter blur-md"></div>
                <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-amber-200/30 rounded-full filter blur-md"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-white">
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-2/5 relative overflow-hidden">
                <img
                  src="/unete-familia.webp"
                  alt="Galletas premium para perros en tazón turquesa con bulldog francés esperando"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent mix-blend-multiply group-hover:from-primary/60 transition-all duration-500"></div>
              </div>

              <div className="md:w-3/5 p-8 md:p-12">
                <div className="inline-block bg-amber-100 rounded-full px-4 py-1 text-amber-800 text-sm font-medium mb-6">
                  Comunidad Pet Gourmet
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 font-display">
                  Únete a Nuestra Familia
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Suscríbete para recibir consejos de nutrición, ofertas exclusivas y ser el primero en conocer nuestros
                  nuevos productos para tu mejor amigo.
                </p>

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Tu correo electrónico"
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                    />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl px-8 py-4 h-auto text-lg font-semibold transition-all duration-300 hover:shadow-lg">
                    Unirme a la comunidad
                  </Button>
                  <p className="text-sm text-gray-500 text-center">
                    Al suscribirte, aceptas recibir correos electrónicos de Pet Gourmet.
                    <br />
                    Puedes darte de baja en cualquier momento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: "🐾",
                title: "Comunidad",
                description: "Únete a miles de dueños de mascotas que comparten experiencias",
              },
              {
                icon: "🎁",
                title: "Beneficios exclusivos",
                description: "Acceso a promociones y descuentos especiales para miembros",
              },
              {
                icon: "📱",
                title: "Contenido premium",
                description: "Consejos de expertos y guías de nutrición para tu mascota",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:bg-white hover:scale-105 cursor-pointer"
              >
                <div className="text-4xl mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 transition-colors duration-300 group-hover:text-primary">
                  {feature.title}
                </h3>
                <p className="text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
