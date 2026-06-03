import Image from "next/image"
import { ArrowRight, BookOpen, Check, Gift, PawPrint } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Suspense } from "react"

import { HomeHero } from "@/components/home-hero"
import { HomeProductsCarousel } from "@/components/home-products-carousel"
import { Button } from "@/components/ui/button"

import "../app/reset.css"

const HomeNewsletter = dynamic(() => import("@/components/home-newsletter"), {
  loading: () => <div className="h-12" />,
})

const HomeVideoShowcase = dynamic(
  () => import("@/components/home-video-showcase").then((module) => module.HomeVideoShowcase),
  {
    loading: () => (
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto h-[280px] max-w-6xl rounded-[36px] border border-[#e6eeef] bg-[#f9fbfb] shadow-[0_24px_60px_rgba(25,63,70,0.08)] md:h-[360px]" />
        </div>
      </section>
    ),
  },
)

const categories = [
  {
    title: "Nuestras Recetas",
    description: "Formulaciones exclusivas para una nutrición completa.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nuestras%20recetas-hcHtwjxfVN0K9uRVXtR1trM0gOZRDf.webp",
    href: "/productos",
    accent: "bg-[#8f5f38]",
  },
  {
    title: "Para Celebrar",
    description: "Momentos especiales con productos pensados para consentir.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20celebrar-SjhsRPMm1PELsrFBBIw2vtSIK9AzeV.webp",
    href: "/celebrar",
    accent: "bg-[#9f7a2e]",
  },
  {
    title: "Para Complementar",
    description: "Apoyo diario para reforzar salud, energía y bienestar.",
    image: "/complementar-dog-treat.webp",
    href: "/complementar",
    accent: "bg-[#356f63]",
  },
  {
    title: "Para Premiar",
    description: "Snacks nutritivos que elevan cada buena conducta.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20premiar-3zEy8fX4CSDDrmAnYIJpl2cV1t26l3.webp",
    href: "/premiar",
    accent: "bg-[#346f8a]",
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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbfc_38%,_#f3f7f8_100%)]">
      <HomeHero />

      <section id="nuestras-recetas" className="relative bg-[linear-gradient(180deg,_#ffffff_0%,_#f7fafb_100%)] py-20 md:py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-[#dce8ea] bg-white px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_10px_24px_rgba(42,120,128,0.06)]">
              Nutrición pensada con intención
            </span>
            <h2 className="mt-6 font-display text-4xl font-bold text-[#16313b] md:text-5xl">
              Descubre la línea ideal para cada momento
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#5d7276]">
              Una navegación más limpia y clara para que cada categoría destaque por lo que ofrece, sin ruido visual
              innecesario.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                href={category.href}
                key={category.title}
                className="group relative flex min-h-[380px] overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_18px_50px_rgba(22,49,59,0.08)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(22,49,59,0.12)]"
              >
                <div className="absolute inset-0">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  <div className={`absolute inset-0 ${category.accent} opacity-78`} />
                </div>

                <div className="relative z-10 mt-auto w-full p-5">
                  <div className="rounded-[24px] border border-white bg-white px-5 py-6 shadow-[0_14px_30px_rgba(22,49,59,0.1)] transition-colors duration-300 group-hover:bg-[#fffdf9]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#16313b]">Pet Gourmet</p>
                    <h3 className="mt-4 text-2xl font-bold text-[#16313b]">{category.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#53686d]">{category.description}</p>
                    <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#16313b]">
                      Descubrir
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="bg-[linear-gradient(180deg,_#f7fafb_0%,_#f3f7f8_100%)] py-20 md:py-24">
            <div className="container mx-auto px-4">
              <div className="h-[420px] rounded-[36px] border border-[#e6eeef] bg-white shadow-[0_20px_50px_rgba(25,63,70,0.06)]" />
            </div>
          </section>
        }
      >
        <HomeProductsCarousel />
      </Suspense>

      <HomeVideoShowcase />

      <section className="relative bg-[linear-gradient(180deg,_#f7fafb_0%,_#f4f8f9_100%)] py-20 md:py-24">
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
                      Ver Todos los Productos
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
                  <div className="relative overflow-hidden rounded-[28px]">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/HERO-vDqIBaCFtETXEYMwu8oZS3EIpZSIcU.webp"
                      alt="Galletas naturales para perros con ingredientes premium"
                      width={900}
                      height={675}
                      className="h-auto w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
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

      <section className="relative bg-[linear-gradient(180deg,_#f4f8f9_0%,_#ffffff_100%)] py-20 md:py-24">
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
