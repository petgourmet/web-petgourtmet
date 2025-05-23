import Image from "next/image"
import Link from "next/link"
import { Leaf, Shield, Heart, Award, Droplets, Utensils } from "lucide-react"

export default function NutricionPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/happy-dog-treat.png"
            alt="Perro feliz comiendo Pet Gourmet"
            fill
            className="object-cover brightness-[0.85]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
              Nutrición premium que puedes ver y ellos pueden sentir
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Alimentos frescos y naturales que mejoran la salud y vitalidad de tu mascota
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/productos"
                className="bg-primary-brand hover:bg-primary-brand/90 text-white font-medium py-3 px-6 rounded-full transition-all"
              >
                Ver productos
              </Link>
              <Link
                href="/crear-plan"
                className="bg-white hover:bg-white/90 text-primary-brand font-medium py-3 px-6 rounded-full transition-all"
              >
                Crear plan personalizado
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Overview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block bg-primary-brand/10 text-primary-brand rounded-full px-4 py-1 text-sm font-medium mb-4">
              BENEFICIOS NUTRICIONALES
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">¿Por qué elegir Pet Gourmet?</h2>
            <p className="text-lg text-gray-700">
              Nuestros productos están diseñados por veterinarios y nutricionistas para proporcionar una alimentación
              completa y equilibrada que promueve la salud y el bienestar de tu mascota.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary-brand/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary-brand" />
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ingredients Spotlight */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-primary-brand/10 text-primary-brand rounded-full px-4 py-1 text-sm font-medium mb-4">
                INGREDIENTES DE CALIDAD
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Solo lo mejor para tu mejor amigo</h2>
              <p className="text-lg text-gray-700 mb-6">
                Utilizamos ingredientes 100% naturales, frescos y de la más alta calidad. Sin conservantes, colorantes
                ni saborizantes artificiales.
              </p>

              <ul className="space-y-4">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-primary-brand/10 flex items-center justify-center mr-3 mt-1">
                      <svg
                        className="w-4 h-4 text-primary-brand"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{ingredient.name}</h4>
                      <p className="text-gray-600">{ingredient.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary-brand/10 rounded-full"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-brand/10 rounded-full"></div>

              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/natural-dog-food-ingredients.png"
                  alt="Ingredientes naturales para perros"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nutritional Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block bg-primary-brand/10 text-primary-brand rounded-full px-4 py-1 text-sm font-medium mb-4">
              RESULTADOS VISIBLES
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Beneficios que notarás en tu mascota</h2>
            <p className="text-lg text-gray-700">
              Una alimentación adecuada se refleja en la salud y vitalidad de tu mascota. Estos son algunos de los
              beneficios que podrás observar al alimentar a tu perro con Pet Gourmet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
              <h3 className="text-2xl font-bold mb-6 text-center">Beneficios a corto plazo</h3>
              <ul className="space-y-4">
                {shortTermBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-primary-brand/10 flex items-center justify-center mr-3 mt-1">
                      <svg
                        className="w-4 h-4 text-primary-brand"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
              <h3 className="text-2xl font-bold mb-6 text-center">Beneficios a largo plazo</h3>
              <ul className="space-y-4">
                {longTermBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-primary-brand/10 flex items-center justify-center mr-3 mt-1">
                      <svg
                        className="w-4 h-4 text-primary-brand"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block bg-primary-brand/10 text-primary-brand rounded-full px-4 py-1 text-sm font-medium mb-4">
              TESTIMONIOS
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Lo que dicen nuestros clientes</h2>
            <p className="text-lg text-gray-700">
              Descubre cómo Pet Gourmet ha mejorado la vida de mascotas y sus dueños
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.comment}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden">
                    <Image
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.pet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-brand/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Comienza a darle lo mejor a tu mascota hoy mismo
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              Descubre nuestra gama de productos naturales y crea un plan de alimentación personalizado para tu mascota
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/productos"
                className="bg-primary-brand hover:bg-primary-brand/90 text-white font-medium py-3 px-6 rounded-full transition-all"
              >
                Ver productos
              </Link>
              <Link
                href="/crear-plan"
                className="bg-white hover:bg-gray-50 text-primary-brand border border-primary-brand font-medium py-3 px-6 rounded-full transition-all"
              >
                Crear plan personalizado
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Data
const benefits = [
  {
    icon: Leaf,
    title: "100% Natural",
    description: "Ingredientes frescos y naturales sin aditivos artificiales, conservantes ni colorantes.",
  },
  {
    icon: Shield,
    title: "Sistema inmunológico fuerte",
    description: "Nutrientes esenciales que fortalecen las defensas naturales de tu mascota.",
  },
  {
    icon: Heart,
    title: "Salud digestiva",
    description: "Fórmulas que promueven una digestión saludable y una mejor absorción de nutrientes.",
  },
  {
    icon: Award,
    title: "Calidad premium",
    description: "Ingredientes de la más alta calidad seleccionados cuidadosamente para tu mascota.",
  },
  {
    icon: Droplets,
    title: "Hidratación óptima",
    description: "Mayor contenido de humedad que ayuda a mantener a tu mascota hidratada.",
  },
  {
    icon: Utensils,
    title: "Sabor irresistible",
    description: "Recetas deliciosas que harán que tu mascota disfrute cada comida.",
  },
]

const ingredients = [
  {
    name: "Proteínas de alta calidad",
    description: "Carnes frescas seleccionadas que proporcionan aminoácidos esenciales para el desarrollo muscular.",
  },
  {
    name: "Frutas y verduras",
    description: "Ricas en vitaminas, minerales y antioxidantes que fortalecen el sistema inmunológico.",
  },
  {
    name: "Grasas saludables",
    description: "Ácidos grasos esenciales que promueven una piel sana y un pelaje brillante.",
  },
  {
    name: "Fibras naturales",
    description: "Favorecen una digestión saludable y ayudan a mantener un peso adecuado.",
  },
]

const shortTermBenefits = [
  "Mayor energía y vitalidad",
  "Mejor digestión y menos problemas gastrointestinales",
  "Heces más pequeñas y menos olorosas",
  "Pelaje más brillante y saludable",
  "Mayor entusiasmo a la hora de comer",
]

const longTermBenefits = [
  "Mejor salud dental y menos problemas bucales",
  "Articulaciones más saludables y mayor movilidad",
  "Reducción de alergias e intolerancias alimentarias",
  "Sistema inmunológico más fuerte",
  "Mayor longevidad y calidad de vida",
]

const testimonials = [
  {
    name: "María García",
    pet: "Dueña de Max, Labrador",
    comment:
      "Desde que empecé a darle Pet Gourmet a Max, su energía ha aumentado y su pelaje luce increíble. ¡Ya no quiere comer otra cosa!",
    avatar: "/woman-and-golden-retriever-park.png",
  },
  {
    name: "Carlos Rodríguez",
    pet: "Dueño de Luna, Bulldog Francés",
    comment:
      "Luna siempre tuvo problemas digestivos hasta que descubrimos Pet Gourmet. Ahora está mucho mejor y disfruta cada comida.",
    avatar: "/man-and-small-dog-park.png",
  },
  {
    name: "Ana Martínez",
    pet: "Dueña de Coco, Border Collie",
    comment:
      "La diferencia en la salud de Coco es notable. Tiene más energía para jugar y su pelaje nunca había lucido tan brillante.",
    avatar: "/joyful-dog-owner.png",
  },
]
