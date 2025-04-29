"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Volume2, VolumeX, Play, Pause } from "lucide-react"
import { useRouter } from "next/navigation"

export function VideoHero() {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [player, setPlayer] = useState<any>(null)
  const [showContent, setShowContent] = useState(true)
  const [showControls, setShowControls] = useState(false) // Inicialmente ocultos
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Detectar si es dispositivo móvil o tablet
    const checkDeviceSize = () => {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
    }

    checkDeviceSize()
    window.addEventListener("resize", checkDeviceSize)

    // Cargar la API de Vimeo Player
    const script = document.createElement("script")
    script.src = "https://player.vimeo.com/api/player.js"
    script.async = true
    script.onload = initializePlayer
    document.body.appendChild(script)

    // Ajustar el tamaño del iframe para mantener la proporción de aspecto
    const adjustIframeSize = () => {
      if (containerRef.current && iframeRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        let aspectRatio, minHeight

        // Transición suave del aspect ratio y altura mínima
        if (window.innerWidth < 640) {
          // Móvil
          aspectRatio = 9 / 10
          minHeight = 550
        } else if (window.innerWidth < 1024) {
          // Tablet
          aspectRatio = 9 / 12
          minHeight = 450
        } else {
          // Desktop
          aspectRatio = 9 / 16
          minHeight = 400
        }

        const videoHeight = containerWidth * aspectRatio
        containerRef.current.style.height = `${Math.max(videoHeight, minHeight)}px`
      }
    }

    // Ajustar tamaño inicialmente y en cada cambio de tamaño de ventana
    adjustIframeSize()
    window.addEventListener("resize", adjustIframeSize)

    // Configurar temporizador para ocultar el contenido después de 2 segundos
    const hideElementsTimer = setTimeout(() => {
      if (contentRef.current) {
        // Añadir clase para animar la desaparición del contenido
        contentRef.current.classList.add("opacity-0", "pointer-events-none")
      }
      setShowContent(false)
      setShowControls(false)
    }, 2000)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      window.removeEventListener("resize", adjustIframeSize)
      window.removeEventListener("resize", checkDeviceSize)
      clearTimeout(hideElementsTimer)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Función para mostrar el contenido al interactuar
  const handleInteraction = () => {
    // Mostrar controles siempre que haya interacción
    setShowControls(true)

    // Para el contenido principal, solo mostrarlo si estaba oculto
    if (!showContent && contentRef.current) {
      contentRef.current.classList.remove("opacity-0", "pointer-events-none")
      setShowContent(true)
    }

    // Limpiar cualquier temporizador existente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Configurar nuevo temporizador para ocultar elementos
    timeoutRef.current = setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.classList.add("opacity-0", "pointer-events-none")
      }
      setShowContent(false)
      setShowControls(false)
    }, 2000)
  }

  const initializePlayer = () => {
    if (typeof window !== "undefined" && window.Vimeo && iframeRef.current) {
      const vimeoPlayer = new window.Vimeo.Player(iframeRef.current, {
        autopause: false,
        background: true,
        loop: true,
        muted: true,
        quality: "1080p",
      })
      setPlayer(vimeoPlayer)

      // Configurar el reproductor
      vimeoPlayer.setVolume(0) // Iniciar silenciado
      vimeoPlayer
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error("Error al reproducir el video:", error)
          setIsPlaying(false)
        })

      // Escuchar eventos del reproductor
      vimeoPlayer.on("play", () => {
        setIsPlaying(true)
      })

      vimeoPlayer.on("pause", () => {
        setIsPlaying(false)
      })
    }
  }

  const toggleMute = () => {
    if (player) {
      player.getVolume().then((volume: number) => {
        const newVolume = volume > 0 ? 0 : 1
        player.setVolume(newVolume)
        setIsMuted(newVolume === 0)
      })
    }
  }

  const togglePlay = () => {
    if (player) {
      player.getPaused().then((paused: boolean) => {
        if (paused) {
          player.play()
        } else {
          player.pause()
        }
      })
    }
  }

  const scrollToRecipes = () => {
    // Primero intentamos encontrar la sección de recetas en la página actual
    const recipesSection = document.getElementById("nuestras-recetas")

    if (recipesSection) {
      // Si existe la sección en la página actual, hacemos scroll suave
      recipesSection.scrollIntoView({ behavior: "smooth" })
    } else {
      // Si no existe, navegamos a la página de recetas
      router.push("/recetas")
    }
  }

  return (
    <section
      className="relative w-full mt-16 overflow-hidden"
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Contenedor del video con proporción de aspecto adaptativa */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <iframe
          ref={iframeRef}
          src="https://player.vimeo.com/video/1078034829?badge=0&autopause=0&player_id=0&app_id=58479&background=1&autoplay=1&loop=1&muted=1&quality=1080p"
          className="absolute top-0 left-0 w-full h-full object-fill"
          style={{
            objectPosition: isMobile ? "center 25%" : isTablet ? "center 30%" : "center 35%",
            bottom: 0,
            display: "block",
          }}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          title="PetGourmet v1"
          loading="lazy"
          aria-label="Video de presentación de Pet Gourmet"
        ></iframe>

        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/40 to-black/30 pointer-events-none dark:bg-transparent"></div>

        {/* Contenido sobre el video - con transición para desaparecer */}
        <div
          ref={contentRef}
          className="relative container mx-auto px-4 h-full flex flex-col justify-center items-start text-white py-8 md:py-16 transition-opacity duration-1000 pt-28 sm:pt-32 md:pt-16"
        >
          <div className="max-w-2xl animate-float-up">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-6 leading-tight font-display">
              No es comida para perros, es{" "}
              <span className="text-gradient">
                <span>comida de verdad</span>
              </span>
            </h1>
            <p className="text-base md:text-xl mb-4 md:mb-8 opacity-90 max-w-lg">
              Alimento premium elaborado con ingredientes frescos y naturales para un compañero más sano y feliz.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button
                onClick={scrollToRecipes}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-4 md:px-8 md:py-6 text-sm md:text-lg rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 btn-glow font-display"
              >
                Descubre Nuestras Recetas
              </Button>
              <Button
                variant="outline"
                className="border-white hover:bg-white/20 hover:border-white px-5 py-4 md:px-8 md:py-6 text-sm md:text-lg rounded-full flex items-center gap-2 backdrop-blur-sm transition-all duration-300 bg-transparent text-white hover:text-white font-display"
              >
                Saber Más <ArrowRight size={16} className="animate-pulse-soft" />
              </Button>
            </div>
          </div>
        </div>

        {/* Controles de video - posición fija, aparecen solo con interacción */}
        <div
          className={`absolute flex gap-2 z-50 transition-opacity duration-300 bottom-4 md:bottom-8 left-4 md:left-8 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{
            transform: "translateY(-80px)",
          }}
        >
          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            className="rounded-full bg-black/50 border-white/50 hover:bg-black/70 backdrop-blur-sm shadow-lg"
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </Button>
          <Button
            onClick={togglePlay}
            variant="outline"
            size="icon"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            className="rounded-full bg-black/50 border-white/50 hover:bg-black/70 backdrop-blur-sm shadow-lg"
          >
            {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
          </Button>
        </div>
      </div>
    </section>
  )
}
