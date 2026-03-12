import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Youtube, Heart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// SVG TikTok icon (lucide-react no lo incluye)
function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
    </svg>
  )
}

const cardClass =
  "bg-gradient-to-br from-[#2e8d96] via-[#24737b] to-[#1a5860] rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10"

export function Footer() {
  return (
    <footer className="bg-primary text-white relative overflow-hidden">
      {/* Iluminaciones decorativas */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-radial from-white/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-radial from-secondary/20 to-transparent rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Columna logo + redes */}
          <div className={`flex flex-col ${cardClass}`}>
            <Link href="/" className="inline-block mb-4 group">
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
            <p className="text-white/90 mb-5 text-sm">Nutrición premium para tus compañeros</p>
            <div className="flex space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="https://web.facebook.com/petgourmetmx?locale=es_LA"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Seguirnos en Facebook"
                      className="text-white/80 hover:text-white transition-all duration-300 hover:scale-110 transform"
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
                      className="text-white/80 hover:text-white transition-all duration-300 hover:scale-110 transform"
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
                      href="https://www.tiktok.com/@petgourmetmex"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Seguirnos en TikTok"
                      className="text-white/80 hover:text-white transition-all duration-300 hover:scale-110 transform"
                    >
                      <TikTokIcon size={20} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>TikTok</p></TooltipContent>
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
                      className="text-white/80 hover:text-white transition-all duration-300 hover:scale-110 transform"
                    >
                      <Youtube size={20} aria-hidden="true" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>YouTube</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Tienda */}
          <div className={cardClass}>
            <h3 className="font-bold text-white uppercase tracking-wide text-xs border-b border-white/20 pb-2 mb-1">
              Tienda
            </h3>
            <ul className="space-y-0">
              <li>
                <Link href="/productos" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Todos los Productos
                </Link>
              </li>
              <li>
                <Link href="/celebrar" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Para Celebrar
                </Link>
              </li>
              <li>
                <Link href="/complementar" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Para Complementar
                </Link>
              </li>
              <li>
                <Link href="/premiar" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Para Premiar
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div className={cardClass}>
            <h3 className="font-bold text-white uppercase tracking-wide text-xs border-b border-white/20 pb-2 mb-1">
              Empresa
            </h3>
            <ul className="space-y-0">
              <li>
                <Link href="/contacto" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Contáctanos
                </Link>
              </li>
            </ul>
          </div>

          {/* Ayuda */}
          <div className={cardClass}>
            <h3 className="font-bold text-white uppercase tracking-wide text-xs border-b border-white/20 pb-2 mb-1">
              Ayuda
            </h3>
            <ul className="space-y-0">
              <li>
                <Link href="/faq" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link href="/proteccion-datos" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Protección de Datos
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="text-white/80 hover:text-white transition-colors duration-300 hover:translate-x-1 block py-2.5 min-h-[48px] flex items-center text-sm">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/20 mt-10 pt-6 text-center text-white text-sm">
          <div className="flex items-center justify-center gap-2">
            <p>&copy; {new Date().getFullYear()} Pet Gourmet. Todos los derechos reservados.</p>
            <Link
              href="https://www.v1tr0.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hecho con amor por V1TR0"
              className="text-red-300 hover:text-red-100 transition-colors duration-200"
            >
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
