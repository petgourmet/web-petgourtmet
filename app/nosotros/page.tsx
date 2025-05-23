import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Heart, Medal, ShieldCheck } from "lucide-react"

export default function NosotrosPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-[#E6F4F6]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7BBDC5]/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#7BBDC5]/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"></div>

        {/* Paw print pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute top-0 left-0 w-full h-full bg-repeat"
            style={{ backgroundImage: "url('/simple-dog-paw.png')", backgroundSize: "60px" }}
          ></div>
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-[#E6F4F6] rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
              Nuestra Historia
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 font-display">
              Sobre <span className="text-[#7BBDC5]">Pet Gourmet</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Somos una empresa dedicada a mejorar la vida de las mascotas a través de una nutrición excepcional,
              utilizando ingredientes de la más alta calidad para crear productos que promueven la salud y felicidad.
            </p>
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              <Image src="/joyful-dog-feast.png" alt="Equipo de Pet Gourmet" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">Nutrición que transforma vidas</h2>
                <p className="text-white/90">Desde 2015 creando experiencias alimenticias excepcionales</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#7BBDC5]/10 rounded-full filter blur-3xl"></div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#7BBDC5]/10 rounded-full filter blur-3xl"></div>
              <div className="relative z-10 bg-white p-4 rounded-2xl shadow-2xl overflow-hidden">
                <Image
                  src="/natural-dog-food-ingredients.png"
                  alt="Ingredientes naturales"
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-xl"
                />
              </div>
              <div className="absolute top-1/2 right-0 transform translate-x-1/4 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-4 z-20">
                <div className="bg-[#E6F4F6] rounded-xl p-4">
                  <h3 className="text-[#7BBDC5] font-bold text-lg mb-1">Desde 2015</h3>
                  <p className="text-gray-700 text-sm">Innovando en nutrición canina</p>
                </div>
              </div>
            </div>
            <div>
              <div className="inline-block bg-[#E6F4F6] rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
                Nuestra Misión
              </div>
              <h2 className="text-4xl font-bold mb-6 text-gray-900 font-display">
                Transformando la <span className="text-[#7BBDC5]">nutrición canina</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Pet Gourmet nació de una pasión por mejorar la vida de las mascotas. Nuestra fundadora, al no encontrar
                opciones de alimentación verdaderamente saludables para su perro, decidió crear una alternativa que
                combinara nutrición óptima con sabores irresistibles.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Hoy, continuamos esa misión con un equipo de veterinarios, nutricionistas y amantes de los animales
                comprometidos con crear los mejores productos para tu mejor amigo.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center bg-[#E6F4F6] rounded-full px-6 py-3">
                  <div className="w-3 h-3 rounded-full bg-[#7BBDC5] mr-3"></div>
                  <span className="text-gray-700 font-medium">Ingredientes premium</span>
                </div>
                <div className="flex items-center bg-[#E6F4F6] rounded-full px-6 py-3">
                  <div className="w-3 h-3 rounded-full bg-[#7BBDC5] mr-3"></div>
                  <span className="text-gray-700 font-medium">Formulación experta</span>
                </div>
                <div className="flex items-center bg-[#E6F4F6] rounded-full px-6 py-3">
                  <div className="w-3 h-3 rounded-full bg-[#7BBDC5] mr-3"></div>
                  <span className="text-gray-700 font-medium">Producción sostenible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-[#E6F4F6]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-white rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
              Nuestros Valores
            </div>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 font-display">
              Principios que <span className="text-[#7BBDC5]">nos guían</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Estos valores fundamentales definen nuestra cultura y guían cada decisión que tomamos, desde la selección
              de ingredientes hasta el servicio al cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <ShieldCheck className="w-8 h-8 text-[#7BBDC5]" />,
                title: "Calidad sin compromisos",
                description:
                  "Utilizamos solo ingredientes de la más alta calidad, seleccionados cuidadosamente para garantizar nutrición óptima.",
              },
              {
                icon: <Heart className="w-8 h-8 text-[#7BBDC5]" />,
                title: "Bienestar animal",
                description:
                  "Cada producto está diseñado pensando en la salud y felicidad de las mascotas, respaldado por investigación veterinaria.",
              },
              {
                icon: <Check className="w-8 h-8 text-[#7BBDC5]" />,
                title: "Sostenibilidad",
                description:
                  "Nos comprometemos con prácticas sostenibles en toda nuestra cadena de producción, minimizando nuestro impacto ambiental.",
              },
              {
                icon: <Medal className="w-8 h-8 text-[#7BBDC5]" />,
                title: "Innovación constante",
                description:
                  "Investigamos continuamente para mejorar nuestras fórmulas y desarrollar nuevos productos que satisfagan necesidades específicas.",
              },
              {
                icon: <Check className="w-8 h-8 text-[#7BBDC5]" />,
                title: "Comunidad",
                description:
                  "Construimos relaciones duraderas con nuestros clientes y sus mascotas, creando una comunidad unida por el amor a los animales.",
              },
              {
                icon: <Check className="w-8 h-8 text-[#7BBDC5]" />,
                title: "Transparencia",
                description:
                  "Creemos en ser completamente transparentes sobre nuestros ingredientes, procesos y prácticas empresariales.",
              },
            ].map((value, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#E6F4F6] flex items-center justify-center text-3xl mb-6 group-hover:bg-[#7BBDC5] group-hover:text-white transition-colors duration-300">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 group-hover:text-[#7BBDC5] transition-colors duration-300">
                  {value.title}
                </h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#E6F4F6] rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
              Nuestro Equipo
            </div>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 font-display">
              Expertos <span className="text-[#7BBDC5]">apasionados</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nuestro equipo está formado por profesionales dedicados que comparten una pasión por mejorar la vida de
              las mascotas a través de la nutrición.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "María Rodríguez",
                role: "Fundadora y CEO",
                bio: "Veterinaria con más de 15 años de experiencia en nutrición animal, María fundó Pet Gourmet con la misión de revolucionar la alimentación canina.",
                image: "/woman-and-golden-retriever-park.png",
              },
              {
                name: "Carlos Méndez",
                role: "Nutricionista Veterinario",
                bio: "Especialista en nutrición canina, Carlos supervisa la formulación de todos nuestros productos para garantizar el equilibrio nutricional perfecto.",
                image: "/man-and-small-dog-park.png",
              },
              {
                name: "Laura Sánchez",
                role: "Directora de Calidad",
                bio: "Con un ojo meticuloso para el detalle, Laura asegura que cada lote de productos cumpla con nuestros rigurosos estándares de calidad.",
                image: "/joyful-dog-owner.png",
              },
            ].map((member, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden group">
                <div className="relative h-64">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-[#7BBDC5] font-medium mb-4">{member.role}</p>
                  <p className="text-gray-600">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Commitment Section */}
      <section className="py-20 bg-[#E6F4F6]/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block bg-[#E6F4F6] rounded-full px-4 py-1 text-[#7BBDC5] text-sm font-medium mb-6">
                Nuestro Compromiso
              </div>
              <h2 className="text-4xl font-bold mb-6 text-gray-900 font-display">
                Ingredientes <span className="text-[#7BBDC5]">Premium</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Nos comprometemos a utilizar solo los ingredientes más frescos y de mayor calidad en cada receta,
                garantizando una nutrición óptima para tu mascota.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "Carnes frescas de primera calidad",
                  "Vegetales orgánicos seleccionados",
                  "Sin conservantes artificiales",
                  "Formulaciones balanceadas por expertos",
                  "Procesos de producción cuidadosos",
                ].map((item, i) => (
                  <div key={i} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7BBDC5] flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <p className="ml-3 text-gray-700">{item}</p>
                  </div>
                ))}
              </div>

              <Button className="bg-[#7BBDC5] hover:bg-[#7BBDC5]/90 text-white rounded-xl px-6 py-2 h-auto">
                Conoce nuestros productos
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#7BBDC5]/10 rounded-full filter blur-3xl"></div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#7BBDC5]/10 rounded-full filter blur-3xl"></div>
              <div className="relative z-10 bg-white p-4 rounded-2xl shadow-2xl overflow-hidden">
                <Image
                  src="/premium-dog-food-bag.png"
                  alt="Alimento premium para perros"
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-xl"
                />
              </div>
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
