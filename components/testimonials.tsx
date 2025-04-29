"use client"

import { useState } from "react"
import Image from "next/image"
import { CardContent } from "@/components/ui/card"
import { Star, Quote } from "lucide-react"
import { SpotlightCard } from "@/components/ui/spotlight-card"

const testimonials = [
  {
    id: 1,
    name: "Sara y Max",
    image: "/joyful-dog-owner.png",
    rating: 5,
    text: "Desde que cambiamos a esta comida, el pelaje de Max está más brillante y tiene mucha más energía. ¡Ahora adora la hora de comer!",
    color: "primary",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
  },
  {
    id: 2,
    name: "Juan y Bella",
    image: "/happy-labrador-walk.png",
    rating: 5,
    text: "Bella solía tener problemas digestivos con otras marcas, pero ha prosperado con esta comida. No más malestar estomacal y está en un peso saludable.",
    color: "pastel-blue",
    spotlightColor: "rgba(214, 238, 245, 0.3)",
  },
  {
    id: 3,
    name: "Elena y Cooper",
    image: "/woman-and-golden-retriever-park.png",
    rating: 4,
    text: "Cooper es un comedor exigente, pero devora esta comida cada vez. Me encanta poder ver ingredientes reales y saber que está recibiendo una nutrición adecuada.",
    color: "pastel-green",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
  },
  {
    id: 4,
    name: "Miguel y Luna",
    image: "/man-and-small-dog-park.png",
    rating: 5,
    text: "Como perro mayor, Luna necesita una nutrición especial. Esta comida ha ayudado a mantener su movilidad y niveles de energía. ¡Nuestro veterinario está impresionado con su salud!",
    color: "secondary",
    spotlightColor: "rgba(140, 74, 35, 0.15)",
  },
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Calculate visible testimonials based on screen size
  const visibleCount = 3
  const visibleTestimonials = []

  for (let i = 0; i < visibleCount; i++) {
    const index = (currentIndex + i) % testimonials.length
    visibleTestimonials.push(testimonials[index])
  }

  return (
    <section className="responsive-section">
      <div className="responsive-container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Perros Felices, Dueños Felices</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Mira lo que nuestros clientes y sus amigos peludos dicen sobre nuestros productos.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleTestimonials.map((testimonial) => (
              <SpotlightCard
                key={testimonial.id}
                spotlightColor={testimonial.spotlightColor}
                className="bg-white dark:bg-white/90 overflow-hidden transition-all duration-500 hover:-translate-y-2 rounded-2xl relative z-10 border border-gray-100 shadow-sm"
              >
                <CardContent className="p-6 relative text-gray-800">
                  {/* Icono de comillas */}
                  <div className="absolute top-4 right-4 text-gray-200 opacity-50">
                    <Quote size={40} />
                  </div>

                  <div className="flex items-center mb-4 relative z-10">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4 border-2 border-primary border-opacity-50 group-hover:border-opacity-100 transition-colors duration-300">
                      <Image
                        src={testimonial.image || "/placeholder.svg"}
                        alt={testimonial.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold font-display text-gray-900">{testimonial.name}</h3>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < testimonial.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="italic relative z-10 text-gray-700">"{testimonial.text}"</p>
                </CardContent>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
