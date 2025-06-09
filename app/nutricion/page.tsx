"use client"
import { useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { clsx } from "clsx"

// Types
import type { PanelID } from "@/types/nutrition"

// Data
import { benefits, productQuestions, shippingQuestions, foodsToAvoid, panelData } from "@/data/nutrition-data"

// Components
import { PanelCard } from "@/components/nutrition/panel-card"
import { Accordion } from "@/components/nutrition/accordion"
import { BenefitCard } from "@/components/nutrition/benefit-card"
import { Modal } from "@/components/nutrition/modal"

const pageClasses = {
  hero: {
    container: "relative h-[80vh] flex items-center overflow-hidden",
    imageWrapper: "absolute inset-0 z-0",
    image: "w-full h-full object-cover brightness-[0.85]",
    overlay: "absolute inset-0 bg-gradient-to-r from-black/60 to-transparent",
    content: "container mx-auto px-4 sm:px-6 lg:px-8 relative z-10",
    textWrapper: "max-w-2xl mx-auto text-center",
    title: "text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6",
    subtitle: "text-xl text-white/90 mb-8",
  },
  section: {
    base: "py-16",
    white: "bg-white",
    gray: "bg-gray-50",
    brand: "bg-primary-brand/10",
  },
  container: "container mx-auto px-4 sm:px-6 lg:px-8",
  textCenter: "text-center max-w-3xl mx-auto mb-16",
  badge: "inline-block bg-primary-brand/10 text-primary-brand rounded-full px-4 py-1 text-sm font-medium mb-4",
  heading: "text-3xl md:text-4xl font-display font-bold mb-6",
  description: "text-lg text-gray-700",
  grid: {
    benefits: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
    panels: "grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto",
  },
  cta: {
    wrapper: "max-w-4xl mx-auto text-center",
    title: "text-3xl md:text-4xl font-display font-bold mb-6",
    description: "text-lg text-gray-700 mb-8",
    buttons: "flex flex-wrap justify-center gap-4",
    primary: "bg-primary-brand hover:bg-primary-brand/90 text-white font-medium py-3 px-6 rounded-full transition-all",
    secondary:
      "bg-white hover:bg-gray-50 text-primary-brand border border-primary-brand font-medium py-3 px-6 rounded-full transition-all",
  },
}

const modalTitles: Record<PanelID, string> = {
  productos: "Preguntas sobre productos",
  envios: "Preguntas sobre envíos",
  alimentos: "Preguntas sobre alimentos",
}

export default function NutricionPage() {
  const [activePanel, setActivePanel] = useState<PanelID | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  const togglePanel = useCallback((panel: PanelID) => {
    setActivePanel((prev) => (prev === panel ? null : panel))
    setExpandedQuestion(null)
  }, [])

  const toggleQuestion = useCallback((index: number) => {
    setExpandedQuestion((prev) => (prev === index ? null : index))
  }, [])

  const closeModal = useCallback(() => {
    setActivePanel(null)
    setExpandedQuestion(null)
  }, [])

  const renderModalContent = () => {
    switch (activePanel) {
      case "productos":
        return <Accordion faqs={productQuestions} expandedIndex={expandedQuestion} onToggle={toggleQuestion} />
      case "envios":
        return <Accordion faqs={shippingQuestions} expandedIndex={expandedQuestion} onToggle={toggleQuestion} />
      case "alimentos":
        return (
          <article className="border border-gray-200 rounded-lg overflow-hidden">
            <header className="p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 text-lg">¿QUÉ ALIMENTOS DEBERÍA EVITAR PARA MI PERRO?</h4>
            </header>
            <div className="p-4 bg-white">
              <Accordion
                faqs={foodsToAvoid.map((food) => ({
                  question: food.name,
                  answer: food.reason,
                }))}
                expandedIndex={expandedQuestion}
                onToggle={toggleQuestion}
              />
            </div>
          </article>
        )
      default:
        return null
    }
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className={pageClasses.hero.container}>
        <div className={pageClasses.hero.imageWrapper}>
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NUTRI-Sk7sdb2eQ8Flwx2ROr0q9qDGRBcGWj.webp"
            alt="Snack natural para perros - Nutrición premium"
            fill
            className={clsx(pageClasses.hero.image, "saturate-90 brightness-60")}
            priority
          />
          <div className={pageClasses.hero.overlay} />
        </div>

        <div className={pageClasses.hero.content}>
          <div className={pageClasses.hero.textWrapper}>
            <h1 className={pageClasses.hero.title}>Nutrición premium que puedes ver y ellos saborear</h1>
            <p className={pageClasses.hero.subtitle}>
              Alimentos frescos y naturales que mejoran la salud y vitalidad de tu mascota
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Overview */}
      <section className={clsx(pageClasses.section.base, pageClasses.section.white)}>
        <div className={pageClasses.container}>
          <div className={pageClasses.textCenter}>
            <span className={pageClasses.badge}>BENEFICIOS NUTRICIONALES</span>
            <h2 className={pageClasses.heading}>¿Por qué elegir Pet Gourmet?</h2>
            <p className={pageClasses.description}>
              Nuestros productos están diseñados por veterinarios y nutricionistas para proporcionar una alimentación
              completa y equilibrada que promueve la salud y el bienestar de tu mascota.
            </p>
          </div>

          <div className={pageClasses.grid.benefits}>
            {benefits.map((benefit, index) => (
              <BenefitCard key={index} benefit={benefit} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={clsx(pageClasses.section.base, pageClasses.section.gray)}>
        <div className={pageClasses.container}>
          <div className={pageClasses.textCenter}>
            <span className={pageClasses.badge}>FAQ</span>
            <h2 className={pageClasses.heading}>Preguntas frecuentes</h2>
            <p className={pageClasses.description}>
              Encuentra respuestas a las preguntas más comunes sobre nuestros productos y servicios
            </p>
          </div>

          <div className={pageClasses.grid.panels}>
            {panelData.map((panel) => (
              <PanelCard
                key={panel.id}
                id={panel.id}
                title={panel.title}
                description={panel.description}
                bgImage={panel.bgImage}
                icon={panel.icon}
                isActive={activePanel === panel.id}
                onClick={togglePanel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Modal */}
      <Modal isOpen={!!activePanel} onClose={closeModal} title={activePanel ? modalTitles[activePanel] : ""}>
        {renderModalContent()}
      </Modal>

      {/* CTA Section */}
      <section className={clsx(pageClasses.section.base, pageClasses.section.brand)}>
        <div className={pageClasses.container}>
          <div className={pageClasses.cta.wrapper}>
            <h2 className={pageClasses.cta.title}>Comienza a darle lo mejor a tu mascota hoy mismo</h2>
            <p className={pageClasses.cta.description}>
              Descubre nuestra gama de productos naturales y crea un plan de alimentación personalizado para tu mascota
            </p>
            <div className={pageClasses.cta.buttons}>
              <Link href="/productos" className={pageClasses.cta.primary}>
                Ver productos
              </Link>
              <Link href="/crear-plan" className={pageClasses.cta.secondary}>
                Crear plan personalizado
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
