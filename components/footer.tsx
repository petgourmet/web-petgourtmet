import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Youtube, Heart } from "lucide-react"

function TikTokIcon({ size = 18 }: { size?: number }) {
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

const SOCIAL = [
  {
    href: "https://web.facebook.com/petgourmetmx?locale=es_LA",
    label: "Facebook",
    icon: <Facebook size={18} aria-hidden="true" />,
  },
  {
    href: "https://www.instagram.com/petgourmet_mx/",
    label: "Instagram",
    icon: <Instagram size={18} aria-hidden="true" />,
  },
  {
    href: "https://www.tiktok.com/@petgourmetmex",
    label: "TikTok",
    icon: <TikTokIcon size={18} />,
  },
  {
    href: "https://www.youtube.com/@PetGourmetMexico",
    label: "YouTube",
    icon: <Youtube size={18} aria-hidden="true" />,
  },
]

const NAV = [
  {
    heading: "Tienda",
    links: [
      { label: "Pasteles de cumpleaños", href: "/celebrar" },
      { label: "Alimentación diaria",    href: "/complementar" },
      { label: "Snacks",                 href: "/premiar" },
      { label: "Todos los productos",    href: "/productos" },
    ],
  },
  {
    heading: "Empresa",
    links: [
      { label: "Nosotros",    href: "/nosotros" },
      { label: "Tiendas",    href: "/tiendas" },
      { label: "Blog",       href: "/blog" },
      { label: "Contáctanos",href: "/contacto" },
    ],
  },
  {
    heading: "Ayuda",
    links: [
      { label: "Política de Reembolso",   href: "/faq" },
      { label: "Protección de Datos",     href: "/proteccion-datos" },
      { label: "Términos y Condiciones",  href: "/terminos" },
      { label: "Política de Privacidad",  href: "/privacidad" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-primary text-white relative overflow-hidden">
      {/* Glow decorativo de fondo */}
      <div className="pointer-events-none absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-[#2a7880]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-48 w-48 rounded-full bg-[#e7ae84]/6 blur-3xl" />

      {/* ── Contenido principal ── */}
      <div className="container relative z-10 mx-auto px-4 py-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[260px_1fr] lg:gap-20">

          {/* ── Tarjeta de marca ── */}
          <div className="flex flex-col gap-6 rounded-[24px] bg-[#2a7880] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
            <Link href="/" aria-label="Pet Gourmet — Inicio">
              <Image
                src="/petgourmet-logo.png"
                alt="Pet Gourmet"
                width={150}
                height={40}
                className="h-10 w-auto"
              />
            </Link>

            <p className="text-sm leading-relaxed text-white/75">
              Nutrición premium horneada con ingredientes frescos y naturales para tu mejor compañero.
            </p>

            {/* Redes sociales */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Síguenos
              </p>
              <div className="flex items-center gap-3">
                {SOCIAL.map(({ href, label, icon }) => (
                  <Link
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/20 hover:text-white hover:scale-110"
                  >
                    {icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Columnas de navegación (planas, sin cajas) ── */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {NAV.map(({ heading, links }) => (
              <div key={heading}>
                <h3 className="mb-5 text-sm font-extrabold uppercase tracking-[0.18em] text-[#16313b]/70">
                  {heading}
                </h3>
                <ul className="space-y-3">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm font-medium text-[#16313b]/80 transition-colors duration-200 hover:text-[#16313b]"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Barra inferior ── */}
      <div className="relative z-10 border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-5 md:flex-row">

          {/* Copyright */}
          <div className="flex items-center gap-2 text-xs text-[#16313b]/60">
            <p>&copy; {new Date().getFullYear()} Pet Gourmet. Todos los derechos reservados.</p>
            <Link
              href="https://www.v1tr0.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hecho con amor por V1TR0"
              className="text-red-400/60 hover:text-red-300 transition-colors duration-200"
            >
              <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </Link>
          </div>

          {/* Métodos de pago */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#16313b]/50 uppercase tracking-wide">Métodos de pago</span>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2">
              {[
                { src: "/iconos/footer/visa.png",       alt: "Visa" },
                { src: "/iconos/footer/mastercard.png", alt: "Mastercard" },
                { src: "/iconos/footer/Maestro.png",    alt: "Maestro" },
              ].map(({ src, alt }) => (
                <Image
                  key={alt}
                  src={src}
                  alt={alt}
                  width={36}
                  height={22}
                  className="h-[18px] w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
