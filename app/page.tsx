import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Star } from "lucide-react"
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
                href: "/recetas",
              },
              {
                title: "Para Celebrar",
                description: "Productos especiales para momentos únicos",
                gradientFrom: "from-amber-400",
                gradientTo: "to-amber-600",
                icon: "🎂",
                href: "/celebrar",
              },
              {
                title: "Para Complementar",
                description: "Refuerza la salud y bienestar diario",
                gradientFrom: "from-emerald-400",
                gradientTo: "to-emerald-600",
                icon: "🌿",
                href: "/complementar",
              },
              {
                title: "Para Premiar",
                description: "Golosinas saludables y nutritivas",
                gradientFrom: "from-sky-400",
                gradientTo: "to-sky-600",
                icon: "🦴",
                href: "/premiar",
              },
            ].map((category, index) => (
              <Link
                href={category.href}
                key={index}
                className="group relative overflow-hidden rounded-2xl shadow-xl transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl h-[400px] flex flex-col cursor-pointer"
              >
                <div className="absolute inset-0 w-full h-full">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo}`}
                  ></div>

                  {/* Elementos decorativos */}
                  <div className="absolute top-6 right-6 text-white/10 text-8xl font-bold pointer-events-none">
                    {category.icon}
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none"></div>
                  <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-white/10 rounded-full pointer-events-none"></div>
                  <div className="absolute bottom-1/3 left-1/2 w-12 h-12 bg-white/10 rounded-full pointer-events-none"></div>
                </div>

                <div className="relative z-10 p-8 mt-auto text-white">
                  <h3 className="text-2xl font-bold mb-2 group-hover:translate-x-2 transition-transform duration-300 pointer-events-none">
                    {category.title}
                  </h3>
                  <p className="text-white/90 mb-4 group-hover:translate-x-2 transition-transform duration-300 delay-75 pointer-events-none">
                    {category.description}
                  </p>
                  <span className="inline-flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform duration-300 delay-100 pointer-events-none">
                    Descubrir <ArrowRight className="ml-2 w-4 h-4 group-hover:ml-3 transition-all" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-amber-50"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 order-2 lg:order-1">
              <div className="bg-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px]"></div>

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
                <div className="relative z-20 rounded-3xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <Image
                    src="/natural-dog-food-ingredients.png"
                    alt="Ingredientes naturales"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-900">
                    Ingredientes de primera calidad
                  </div>
                </div>

                {/* Floating decorative elements */}
                <div className="absolute top-10 -right-10 z-10 bg-white rounded-2xl shadow-xl p-3 transform -rotate-6">
                  <Image
                    src="/juicy-steak-icon.png"
                    alt="Carne premium"
                    width={60}
                    height={60}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                </div>

                <div className="absolute -bottom-8 -left-8 z-10 bg-white rounded-2xl shadow-xl p-3 transform rotate-6">
                  <Image
                    src="/assorted-vegetables-icon.png"
                    alt="Vegetales frescos"
                    width={60}
                    height={60}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                </div>

                {/* Background decorative circles */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full filter blur-md"></div>
                <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-amber-200/30 rounded-full filter blur-md"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 font-display">
              Lo Que Dicen Nuestros Clientes
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Descubre por qué nuestros clientes y sus mascotas adoran nuestros productos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sara y Max",
                image: "/joyful-dog-owner.png",
                text: "Desde que cambiamos a esta comida, el pelaje de Max está más brillante y tiene mucha más energía. ¡Ahora adora la hora de comer!",
              },
              {
                name: "Juan y Bella",
                image: "/happy-labrador-walk.png",
                text: "Bella solía tener problemas digestivos con otras marcas, pero ha prosperado con esta comida. No más malestar estomacal y está en un peso saludable.",
              },
              {
                name: "Elena y Cooper",
                image: "/woman-and-golden-retriever-park.png",
                text: "Cooper es un comedor exigente, pero devora esta comida cada vez. Me encanta poder ver ingredientes reales y saber que está recibiendo una nutrición adecuada.",
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-6">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary mr-4">
                    <Image
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{testimonial.name}</h4>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-300/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"></div>

        {/* Paw print pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute top-0 left-0 w-full h-full bg-repeat"
            style={{ backgroundImage: "url('/simple-dog-paw.png')", backgroundSize: "60px" }}
          ></div>
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-2/5 relative">
                <Image src="/happy-dog-treat.png" alt="Happy dog with treats" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent mix-blend-multiply"></div>
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
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
