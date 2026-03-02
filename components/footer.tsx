import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Youtube, Heart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Footer() {
  return (
    <footer className="bg-[#1d4a52] text-white relative overflow-hidden">
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="https://web.facebook.com/petgourmetmx?locale=es_LA"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Seguirnos en Facebook"
                      className="text-white/80 hover:text-white transition-colors duration-300 hover:scale-110 transform"
                    >
                      <Facebook size={20} aria-hidden="true" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>Facebook</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="https://www.instagram.com/petgourmet_mx/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Seguirnos en Instagram"
                      className="text-white/80 hover:text-white transition-colors duration-300 hover:scale-110 transform"
                    >
                      <Instagram size={20} aria-hidden="true" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>Instagram</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="https://www.youtube.com/@PetGourmetMexico"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ver nuestro canal de YouTube"
                      className="text-white/80 hover:text-white transition-colors duration-300 hover:scale-110 transform"
                    >
                      <Youtube size={20} aria-hidden="true" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>YouTube</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 text-white uppercase tracking-wide text-sm border-b border-white/20 pb-2">
              Tienda
            </h3>
            <ul className="space-y-0">
              <li>
                <Link
                  href="/productos"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Todos los Productos
                </Link>
              </li>
              <li>
                <Link
                  href="/celebrar"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Para Celebrar
                </Link>
              </li>
              <li>
                <Link
                  href="/complementar"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Para Complementar
                </Link>
              </li>
              <li>
                <Link
                  href="/premiar"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
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
            <ul className="space-y-0">
              <li>
                <Link
                  href="/contacto"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
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
            <ul className="space-y-0">
              <li>
                <Link
                  href="/faq"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link
                  href="/proteccion-datos"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Protección de Datos
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-white/90 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-3 min-h-[48px] flex items-center"
                >
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/80 text-sm">
          <div className="flex items-center justify-center gap-2">
            <p>&copy; {new Date().getFullYear()} Pet Gourmet. Todos los derechos reservados.</p>
            <Link 
              href="https://www.v1tr0.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Hecho con amor por V1TR0"
              className="text-red-400 hover:text-red-300 transition-colors duration-200"
            >
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
