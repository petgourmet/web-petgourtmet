import Image from "next/image"
import { ArrowRight, BookOpen, Check, Gift, PawPrint } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Suspense } from "react"

import { HomeHero } from "@/components/home-hero"
import { HomeRecipesSection } from "@/components/home-recipes-section"
import { Button } from "@/components/ui/button"

import "../app/reset.css"

const HomeNewsletter = dynamic(() => import("@/components/home-newsletter"), {
  loading: () => <div className="h-12" />,
})

const categories = [
  {
    title: "Pasteles de cumpleaños",
    description: "Momentos especiales con productos pensados para consentir.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20celebrar-SjhsRPMm1PELsrFBBIw2vtSIK9AzeV.webp",
    href: "/celebrar",
    gradientFrom: "from-amber-400",
    gradientTo: "to-amber-600",
  },
  {
    title: "Alimentación diaria",
    description: "Apoyo diario para reforzar salud, energía y bienestar.",
    image: "/complementar-dog-treat.webp",
    href: "/complementar",
    gradientFrom: "from-emerald-400",
    gradientTo: "to-emerald-600",
  },
  {
    title: "Snacks",
    description: "Snacks nutritivos que elevan cada buena conducta.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20premiar-3zEy8fX4CSDDrmAnYIJpl2cV1t26l3.webp",
    href: "/premiar",
    gradientFrom: "from-sky-400",
    gradientTo: "to-sky-600",
  },
]

const ingredientsFeatures = [
  {
    title: "100% Natural",
    description: "Ingredientes frescos y nobles, sin procesos agresivos.",
  },
  {
    title: "Sin Aditivos",
    description: "Libre de conservantes y rellenos innecesarios.",
  },
  {
    title: "Formulación Experta",
    description: "Desarrollado con enfoque nutricional para su bienestar.",
  },
  {
    title: "Beneficios Reales",
    description: "Sabor, energía y una experiencia diaria más saludable.",
  },
]

const communityBenefits = [
  {
    icon: PawPrint,
    title: "Comunidad",
    description: "Historias, consejos y experiencias de familias que cuidan mejor a sus mascotas.",
  },
  {
    icon: Gift,
    title: "Beneficios exclusivos",
    description: "Acceso temprano a promociones, lanzamientos y descuentos especiales.",
  },
  {
    icon: BookOpen,
    title: "Contenido útil",
    description: "Guías prácticas y recomendaciones para mejorar su rutina diaria.",
  },
]

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-gray-900">
      <HomeHero />

      <Suspense
        fallback={
          <section className="bg-white dark:bg-gray-900 py-20 md:py-24">
            <div className="container mx-auto px-4">
              <div className="h-[500px] rounded-[36px] border border-[#e6eeef] bg-white shadow-[0_20px_50px_rgba(25,63,70,0.06)] animate-pulse" />
            </div>
          </section>
        }
      >
        <HomeRecipesSection />
      </Suspense>

      <section id="categorias-menu" className="relative bg-white dark:bg-gray-900 py-20 md:py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-[#dce8ea] bg-white px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_10px_24px_rgba(42,120,128,0.06)]">
              Líneas Especiales
            </span>
            <h2 className="mt-6 font-display text-4xl font-bold text-[#16313b] md:text-5xl">
              Navega por nuestras categorías principales
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#5d7276]">
              Una navegación directa y clara para que encuentres rápidamente lo que tu compañero necesita para su bienestar diario y momentos especiales.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
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
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                        Descubrir <ArrowRight className="ml-2 h-4 w-4 group-hover:ml-3 transition-all" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-white dark:bg-gray-900 py-20 md:py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-[34px] border border-white bg-white p-7 shadow-[0_28px_70px_rgba(22,49,59,0.08)] sm:p-10">
                <div className="relative z-10">
                  <span className="inline-flex rounded-full bg-[#eef7f8] px-4 py-2 text-sm font-semibold text-[#1d636b]">
                    Calidad Premium
                  </span>
                  <h2 className="mt-6 font-display text-4xl font-bold leading-tight text-[#16313b] md:text-5xl">
                    Ingredientes premium para su mejor versión diaria
                  </h2>
                  <p className="mt-6 text-lg leading-relaxed text-[#5d7276]">
                    Cada receta busca equilibrio entre sabor, nutrición y una experiencia de compra más clara, moderna
                    y agradable.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {ingredientsFeatures.map((feature) => (
                      <div
                        key={feature.title}
                        className="rounded-[22px] border border-[#e3ecee] bg-[#fbfdfd] p-5 shadow-[0_12px_28px_rgba(22,49,59,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(22,49,59,0.08)]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 rounded-full bg-[#eef7f8] p-2 text-[#1d636b]">
                            <Check className="h-4 w-4" />
                          </span>
                          <div>
                            <h3 className="font-semibold text-[#16313b]">{feature.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#607478]">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    className="mt-10 rounded-full bg-[#2a7880] px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-[#1d636b] hover:shadow-[0_18px_40px_rgba(29,99,107,0.18)]"
                  >
                    <Link href="/productos" className="flex items-center">
                      Ver Productos
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-[660px]">
                <div className="absolute -left-4 top-12 h-28 w-28 rounded-full bg-[#f3d8ad]/45 blur-2xl" />
                <div className="absolute right-4 top-0 h-40 w-40 rounded-full bg-[#7AB8BF]/16 blur-3xl" />

                <div className="relative overflow-hidden rounded-[34px] border border-white bg-white p-3 shadow-[0_30px_80px_rgba(22,49,59,0.1)]">
                  <div className="relative overflow-hidden rounded-[28px] aspect-[16/9] bg-[#11333a]">
                    <video
                      className="h-full w-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      poster="/hero-poster.webp"
                    >
                      <source
                        src="https://res.cloudinary.com/dn7unepxa/video/upload/q_auto,vc_vp9/v1772482021/video_ev8mjp.webm"
                        type="video/webm"
                      />
                      <source
                        src="https://res.cloudinary.com/dn7unepxa/video/upload/q_auto/v1772482021/video_ev8mjp.mp4"
                        type="video/mp4"
                      />
                    </video>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white bg-white px-5 py-4 shadow-[0_18px_40px_rgba(22,49,59,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d8f92]">Ingredientes</p>
                  <p className="mt-2 text-base font-bold text-[#16313b]">Calidad visible desde el primer vistazo.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-white dark:bg-gray-900 py-20 md:py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="overflow-hidden rounded-[36px] border border-white bg-white shadow-[0_30px_80px_rgba(22,49,59,0.08)]">
            <div className="grid md:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.05fr)]">
              <div className="relative min-h-[320px] overflow-hidden md:min-h-full">
                <Image
                  src="/unete-familia.webp"
                  alt="Galletas premium para perros en tazón turquesa con bulldog francés esperando"
                  width={600}
                  height={800}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,77,83,0.04),rgba(26,77,83,0.38))]" />
                <div className="absolute bottom-6 left-6 right-6 rounded-[24px] border border-white bg-white px-5 py-4 shadow-[0_18px_40px_rgba(22,49,59,0.12)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d8f92]">Comunidad Pet Gourmet</p>
                  <p className="mt-3 text-xl font-bold leading-tight text-[#16313b]">
                    Consejos, novedades y beneficios para consentirlo mejor.
                  </p>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <span className="inline-flex rounded-full bg-[#f4e0b6] px-4 py-2 text-sm font-semibold text-[#8a5d28]">
                  Comunidad Pet Gourmet
                </span>
                <h2 className="mt-6 font-display text-3xl font-bold text-[#16313b] md:text-4xl">Únete a Nuestra Familia</h2>
                <p className="mt-5 text-lg leading-relaxed text-[#5d7276]">
                  Suscríbete para recibir ideas, lanzamientos y ofertas exclusivas con una experiencia más cuidada,
                  cercana y útil para tu día a día.
                </p>

                <div className="mt-8">
                  <HomeNewsletter />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {communityBenefits.map((benefit) => {
              const Icon = benefit.icon

              return (
                <div
                  key={benefit.title}
                  className="rounded-[28px] border border-white bg-white p-6 shadow-[0_18px_44px_rgba(22,49,59,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(22,49,59,0.1)]"
                >
                  <div className="inline-flex rounded-full bg-[#eef7f8] p-3 text-[#1d636b]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-[#16313b]">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#607478]">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
