"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface FaqItem {
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    question: "¿Qué hace que Pet Gourmet sea diferente de otras marcas de comida para mascotas?",
    answer:
      "Pet Gourmet se distingue por utilizar ingredientes 100% naturales, sin conservantes artificiales ni subproductos. Nuestras recetas son desarrolladas por veterinarios y nutricionistas caninos para garantizar una alimentación balanceada y deliciosa para tu mascota.",
  },
  {
    question: "¿Cómo sé qué producto es el adecuado para mi mascota?",
    answer:
      "Te recomendamos utilizar nuestro creador de planes personalizado, donde consideramos la edad, peso, nivel de actividad y necesidades específicas de tu mascota para recomendarte los productos más adecuados. También puedes contactar a nuestro equipo de atención al cliente para recibir asesoramiento personalizado.",
  },
  {
    question: "¿Cuánto tiempo duran los productos una vez abiertos?",
    answer:
      "Nuestros productos secos tienen una duración de 4-6 semanas una vez abiertos, siempre que se mantengan en un lugar fresco y seco en su envase original bien cerrado. Los productos húmedos deben consumirse en 2-3 días y mantenerse refrigerados después de abrirse.",
  },
  {
    question: "¿Realizan envíos a todo México?",
    answer:
      "Sí, realizamos envíos a todo México. Los pedidos superiores a $800 MXN tienen envío gratuito. El tiempo de entrega varía entre 2-5 días hábiles dependiendo de la ubicación.",
  },
  {
    question: "¿Puedo cambiar o cancelar mi suscripción?",
    answer:
      "Por supuesto. Puedes modificar, pausar o cancelar tu suscripción en cualquier momento desde tu cuenta o contactando a nuestro servicio al cliente. No hay penalizaciones por cancelación y procesamos los cambios de inmediato.",
  },
  {
    question: "¿Qué hago si mi mascota no le gusta el producto?",
    answer:
      "Ofrecemos una garantía de satisfacción. Si tu mascota no disfruta alguno de nuestros productos, contáctanos dentro de los 30 días posteriores a la compra y te ofreceremos un reembolso o un cambio por otro producto que pueda ser más adecuado.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-primary">Preguntas Frecuentes</h2>
        <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
          Encuentra respuestas a las preguntas más comunes sobre nuestros productos y servicios.
        </p>

        <div className="max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <div key={index} className="mb-4">
              <button
                className={`w-full text-left p-4 flex justify-between items-center ${
                  openIndex === index ? "bg-primary text-white" : "bg-white text-gray-800"
                } rounded-lg shadow-sm hover:shadow-md transition-all duration-300`}
                onClick={() => toggleFaq(index)}
              >
                <span className="font-medium">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${
                    openIndex === index ? "transform rotate-180" : ""
                  }`}
                />
              </button>

              {openIndex === index && (
                <div className="bg-white p-4 rounded-b-lg shadow-sm border-t border-gray-100">
                  <p className="text-gray-600">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">¿No encuentras lo que buscas? Contáctanos directamente</p>
          <a href="#contacto" className="inline-block mt-2 text-primary font-medium hover:underline">
            Ir a contacto
          </a>
        </div>
      </div>
    </section>
  )
}
