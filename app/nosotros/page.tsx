import Image from "next/image"

export default function NosotrosPage() {
  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-illuminated">
        <div className="responsive-container">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Sobre Nosotros</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-center mb-12">
            Conoce nuestra historia y compromiso con la nutrición de calidad para tu mascota.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-primary font-display">Nuestra Historia</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Pet Gourmet nació en 2015 de la pasión de un grupo de amantes de los perros y expertos en nutrición
                animal. Frustrados por la falta de opciones realmente saludables en el mercado, decidimos crear nuestra
                propia línea de alimentos que priorizara ingredientes naturales y procesos de elaboración cuidadosos.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Desde nuestros humildes comienzos en una pequeña cocina, hemos crecido hasta convertirnos en una marca
                reconocida por su compromiso con la calidad y el bienestar animal, sin nunca perder de vista nuestra
                misión original: proporcionar la mejor nutrición posible para nuestros amigos peludos.
              </p>
            </div>
            <div className="relative h-80 rounded-xl overflow-hidden shadow-xl">
              <Image src="/joyful-dog-owner.png" alt="Fundadores de Pet Gourmet" fill className="object-cover" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-[#e7ae84] p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-3 text-primary dark:text-white font-display">Nuestra Misión</h3>
              <p className="text-gray-600 dark:text-white">
                Proporcionar alimentos naturales y nutritivos que contribuyan a la salud y felicidad de las mascotas,
                utilizando ingredientes de la más alta calidad y procesos de elaboración responsables.
              </p>
            </div>
            <div className="bg-white dark:bg-[#e7ae84] p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-3 text-primary dark:text-white font-display">Nuestra Visión</h3>
              <p className="text-gray-600 dark:text-white">
                Ser reconocidos como líderes en nutrición premium para mascotas, estableciendo nuevos estándares de
                calidad en la industria y educando a los dueños sobre la importancia de una alimentación adecuada.
              </p>
            </div>
            <div className="bg-white dark:bg-[#e7ae84] p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-3 text-primary dark:text-white font-display">Nuestros Valores</h3>
              <p className="text-gray-600 dark:text-white">
                Calidad sin compromisos, transparencia en nuestros procesos, respeto por el bienestar animal,
                sostenibilidad ambiental y un servicio al cliente excepcional.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#e7ae84] p-8 rounded-xl shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary dark:text-white font-display text-center">
              Nuestro Equipo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                {
                  name: "María Rodríguez",
                  role: "Fundadora y CEO",
                  image: "/woman-and-golden-retriever-park.png",
                },
                {
                  name: "Carlos Sánchez",
                  role: "Nutricionista Canino",
                  image: "/man-and-small-dog-park.png",
                },
                {
                  name: "Laura Gómez",
                  role: "Chef de Producto",
                  image: "/joyful-dog-owner.png",
                },
                {
                  name: "Javier Martínez",
                  role: "Director de Calidad",
                  image: "/happy-labrador-walk.png",
                },
              ].map((member, index) => (
                <div key={index} className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20">
                    <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
                  </div>
                  <h3 className="font-bold text-lg dark:text-white">{member.name}</h3>
                  <p className="text-gray-500 dark:text-white/70">{member.role}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display">Únete a Nuestra Familia</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              En Pet Gourmet, no solo vendemos alimentos para mascotas, creamos una comunidad de dueños comprometidos
              con la salud y bienestar de sus compañeros peludos. Te invitamos a formar parte de esta familia.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
