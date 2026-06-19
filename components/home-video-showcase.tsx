import { LazyVideo } from "./lazy-video"

export function HomeVideoShowcase() {
  return (
    <section className="relative py-10 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-[#dce8ea] bg-white px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-sm">
            Conoce Pet Gourmet
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold text-[#16313b] md:text-4xl">
            Mira más de cerca lo que hace especial a Pet Gourmet
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#607478] md:text-lg">
            Descubre el producto, su preparación y la experiencia que lo convierte en algo distinto para consentir mejor
            a tu mascota.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-[36px] border border-white bg-white p-4 shadow-custom-card sm:p-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-center">
            <div className="order-2 px-1 pb-2 lg:order-1 lg:px-4 lg:pb-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d8f92]">Video destacado</p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-[#16313b] md:text-3xl">
                Conoce el sabor, la calidad y el cuidado detrás de cada receta
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#607478] md:text-base">
                Un vistazo rápido para descubrir por qué nuestras recetas se sienten especiales desde el primer momento.
              </p>
            </div>

            <div className="order-1 lg:order-2">
              <LazyVideo
                poster="/hero-poster.webp"
                srcWebm="https://res.cloudinary.com/dn7unepxa/video/upload/q_auto,vc_vp9/v1772482021/video_ev8mjp.webm"
                srcMp4="https://res.cloudinary.com/dn7unepxa/video/upload/q_auto/v1772482021/video_ev8mjp.mp4"
                alt="Conoce Pet Gourmet Video"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
