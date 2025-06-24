import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function NosotrosPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-[#E6F4F6]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7BBDC5]/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#7BBDC5]/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-[#E6F4F6] rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
              Nuestra Historia
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 font-display">
              <span className="text-[#7BBDC5]">Fuimos Cachorros</span>
            </h1>
            <div className="text-xl text-gray-600 mb-10 leading-relaxed space-y-6">
              <p>
                Pet Gourmet nació en Ciudad de mexixo - Colombia como idea en 2009. Nuestra primera gran receta fueron los
                pasteles de cumpleaños que promocionamos a través de un modesto blog en internet y también entre
                conocidos y amigos.
              </p>
              <p>
                Poco a poco nuestros fans fueron aumentando, lo que nos motivó a conocer más de la gastronomía canina,
                viajar, investigar, probar y validar nuevas recetas con la orientación de expertos.
              </p>
              <p>
                En 2011 lanzamos nuestra página oficial con 10 deliciosos hallazgos que de inmediato tuvieron la
                aceptación de la comunidad peluda local. Finalmente en agosto de 2012 tuvimos la fortuna de abrir
                nuestro local y desde entonces las buenas noticias no se han detenido gracias a que cada vez más amos se
                convencen de que la alimentación de su mascota merece una alternativa diferente, natural y saludable.
              </p>
            </div>
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-3xl hover:scale-[1.02] group cursor-pointer">
              <Image src="/cachorros-historia.webp" alt="Historia de Fuimos Cachorros" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent transition-all duration-500 hover:from-gray-900/50 hover:to-gray-900/10"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white transition-all duration-500 group-hover:transform group-hover:translate-y-[-8px]">
                <h2 className="text-2xl font-bold mb-2 transition-all duration-500 group-hover:text-[#7BBDC5]">
                  Nutrición que transforma vidas
                </h2>
                <p className="text-white/90 transition-all duration-500 group-hover:text-white">
                  Desde 2009 creando experiencias alimenticias excepcionales
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Image Section */}
      <section className="py-16 bg-gradient-to-br from-[#E6F4F6] to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative w-full h-auto rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Insistiremos-siempre-1.jpg-jLIt6UEAPFDLj1hgqEiRmVrkf1WGmW.jpeg"
                alt="Filosofía Pet Gourmet - Ingredientes naturales y saludables"
                className="w-full h-auto object-contain transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Standards Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 font-display">
              HACEMOS LAS COSAS COMO <span className="text-[#7BBDC5]">DEBEN HACERSE</span>
            </h2>
            <div className="text-lg text-gray-600 leading-relaxed space-y-6">
              <p>
                Ser reconocidos como una empresa legalmente constituida, con experiencia comprobada en su actividad
                comercial.
              </p>
              <p>
                Contar con una planta física idónea, con las instalaciones, los equipos, el personal experto, incluyendo
                profesionales en gastronomía, que garantizan los procesos apropiados y estándares de calidad en la
                preparación de alimentos para mascotas.
              </p>
              <p>
                Reunir los estudios y los exámenes de laboratorio necesarios para determinar la composición adecuada de
                ingredientes en cada receta, tales como pruebas de estabilidad, estudios bromatológicos y
                microbiológicos.
              </p>
              <p>Tener la supervisión y asesoría permanente de un Médico Veterinario especialista.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-[#E6F4F6] to-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7BBDC5]/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#7BBDC5]/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"></div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block bg-white rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
              Únete a Nosotros
            </div>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 font-display">
              Descubre la diferencia <span className="text-[#7BBDC5]">Pet Gourmet</span>
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              Transforma la vida de tu mascota con nutrición de calidad premium. Nuestros productos están diseñados para
              promover la salud, vitalidad y felicidad de tu mejor amigo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="bg-[#7BBDC5] hover:bg-[#7BBDC5]/90 text-white rounded-xl px-8 py-6 h-auto text-lg font-semibold"
              >
                <Link href="/productos">
                  Ver Productos
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10 rounded-xl px-8 py-6 h-auto text-lg font-semibold"
              >
                <Link href="/contacto">Contactar</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
