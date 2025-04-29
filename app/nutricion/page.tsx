import Image from "next/image"
import { Check } from "lucide-react"

export default function NutricionPage() {
  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-illuminated">
        <div className="responsive-container">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Nutrición Canina</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-center mb-12">
            Descubre cómo nuestros productos están diseñados para proporcionar una nutrición óptima y equilibrada para
            tu mascota.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div className="order-2 md:order-1">
              <h2 className="text-2xl font-bold mb-4 text-primary font-display">
                La Importancia de una Buena Nutrición
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Una nutrición adecuada es fundamental para la salud y el bienestar de tu perro. Los alimentos que
                consume no solo afectan su energía diaria, sino también su salud a largo plazo, calidad de vida y
                longevidad.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                En Pet Gourmet, entendemos que cada perro es único, con necesidades nutricionales específicas según su
                edad, tamaño, raza y nivel de actividad. Por eso, desarrollamos recetas equilibradas que proporcionan
                todos los nutrientes esenciales en las proporciones adecuadas.
              </p>
            </div>
            <div className="relative h-80 rounded-xl overflow-hidden shadow-xl order-1 md:order-2">
              <Image
                src="/natural-dog-food-ingredients.png"
                alt="Ingredientes naturales para perros"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm p-8 rounded-xl shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary dark:text-white font-display text-center">
              Nuestros Principios Nutricionales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Ingredientes Reales",
                  description:
                    "Utilizamos carne fresca, frutas y verduras reales, evitando subproductos y derivados de baja calidad.",
                  color: "primary",
                },
                {
                  title: "Balance Perfecto",
                  description:
                    "Cada receta está formulada para proporcionar un equilibrio óptimo de proteínas, grasas, carbohidratos, vitaminas y minerales.",
                  color: "secondary",
                },
                {
                  title: "Sin Aditivos Nocivos",
                  description:
                    "No utilizamos conservantes artificiales, colorantes, saborizantes ni otros aditivos que puedan ser perjudiciales.",
                  color: "pastel-blue",
                },
                {
                  title: "Digestibilidad Superior",
                  description:
                    "Nuestros procesos de elaboración garantizan una alta digestibilidad, permitiendo una mejor absorción de nutrientes.",
                  color: "pastel-green",
                },
                {
                  title: "Adaptado a Cada Etapa",
                  description:
                    "Ofrecemos fórmulas específicas para cachorros, adultos y perros senior, adaptadas a sus necesidades cambiantes.",
                  color: "pastel-yellow",
                },
                {
                  title: "Testado Científicamente",
                  description:
                    "Todas nuestras recetas son desarrolladas por expertos en nutrición animal y sometidas a rigurosos controles de calidad.",
                  color: "pastel-pink",
                },
              ].map((principle, index) => (
                <div key={index} className="flex flex-col">
                  <div className={`bg-${principle.color}/10 dark:bg-white/10 p-4 rounded-xl mb-4 flex-grow`}>
                    <h3 className="font-bold text-lg mb-2 flex items-center">
                      <span
                        className={`bg-${principle.color}/20 dark:bg-white/20 text-${principle.color === "secondary" ? "secondary" : "primary"} dark:text-white p-1 rounded-full mr-2`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="dark:text-white">{principle.title}</span>
                    </h3>
                    <p className="text-gray-600 dark:text-white">{principle.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display text-center">
              Beneficios de Nuestra Nutrición
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-4 text-primary dark:text-white font-display">Salud Física</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Pelaje brillante y piel saludable</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Mejor digestión y menos problemas gastrointestinales</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Articulaciones sanas y mayor movilidad</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Sistema inmunológico fortalecido</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Peso corporal óptimo</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-4 text-primary dark:text-white font-display">Bienestar General</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Mayor energía y vitalidad</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Mejor estado de ánimo y comportamiento</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Desarrollo cognitivo mejorado</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Reducción del estrés y la ansiedad</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 dark:bg-white/20 text-primary dark:text-white rounded-full p-1 mr-3 mt-1">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="dark:text-white">Mayor esperanza de vida</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display">Consulta Nutricional Personalizada</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              ¿No estás seguro de qué alimento es el más adecuado para tu perro? Nuestro equipo de expertos en nutrición
              canina está disponible para ofrecerte asesoramiento personalizado según las necesidades específicas de tu
              mascota.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
