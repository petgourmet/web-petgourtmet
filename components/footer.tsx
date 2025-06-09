import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Youtube } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-primary text-white relative overflow-hidden">
      {/* Iluminaciones decorativas */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-radial from-white/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-radial from-secondary/20 to-transparent rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="inline-block mb-6 group">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-radial from-white/20 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Image
                  src="/petgourmet-logo.png"
                  alt="Pet Gourmet Logo"
                  width={150}
                  height={40}
                  className="h-10 w-auto relative"
                />
              </div>
            </Link>
            <p className="text-white/80 mb-6">Nutrición premium para tus compañeros</p>
            <div className="flex space-x-4">
              <Link
                href="https://web.facebook.com/petgourmetmx?locale=es_LA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300 hover:scale-110 transform"
              >
                <Facebook size={20} />
              </Link>
              <Link
                href="https://www.instagram.com/petgourmet_mx/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300 hover:scale-110 transform"
              >
                <Instagram size={20} />
              </Link>
              <Link
                href="https://www.youtube.com/@PetGourmetMexico"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300 hover:scale-110 transform"
              >
                <Youtube size={20} />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 text-white uppercase tracking-wide text-sm border-b border-white/20 pb-2">
              Tienda
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/productos"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Todos los Productos
                </Link>
              </li>
              <li>
                <Link
                  href="/celebrar"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Para Celebrar
                </Link>
              </li>
              <li>
                <Link
                  href="/complementar"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Para Complementar
                </Link>
              </li>
              <li>
                <Link
                  href="/premiar"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Para Premiar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 text-white uppercase tracking-wide text-sm border-b border-white/20 pb-2">
              Empresa
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contacto"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Contáctanos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 text-white uppercase tracking-wide text-sm border-b border-white/20 pb-2">
              Ayuda
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/faq"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link
                  href="/proteccion-datos"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Protección de Datos
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/80 text-sm">
          <p>&copy; {new Date().getFullYear()} Pet Gourmet. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
