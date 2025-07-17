"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface Tienda {
  id: string
  nombre: string
  ubicacion: string
  direccion: string
  coordenadas: {
    lat: number
    lng: number
  }
  googleMapsUrl: string
  logo?: string
  descripcion?: string
  horarios?: string
  telefono?: string
}

interface TiendasContextType {
  tiendas: Tienda[]
  selectedTienda: Tienda | null
  setSelectedTienda: (tienda: Tienda | null) => void
  isLoading: boolean
}

const TiendasContext = createContext<TiendasContextType | undefined>(undefined)

const tiendasData: Tienda[] = [
  {
    id: "pet-society-polanco",
    nombre: "Pet Society",
    ubicacion: "Polanco",
    direccion: "Goldsmith 56, Polanco, Polanco III Secc, Miguel Hidalgo, 11560 Ciudad de México, CDMX",
    coordenadas: {
      lat: 19.431458,
      lng: -99.200815
    },
    googleMapsUrl: "https://www.google.com.mx/maps/place/Pet+Society+Polanco/@19.431458,-99.2033899,17z/data=!3m1!4b1!4m6!3m5!1s0x85d20202b57f0dcd:0x67888f6749ce493f!8m2!3d19.431458!4d-99.200815!16s%2Fg%2F11b7ytt_pl?hl=es&entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D",
    logo: "/tiendas/pet-society-logo.png",
    descripcion: "Boutique especializada en productos premium para mascotas en el corazón de Polanco.",
    horarios: "Lun - Sab: 10:00 - 20:00, Dom: 11:00 - 18:00",
    telefono: "+52 55 1234 5678"
  },
  {
    id: "pets-excellence-escandon",
    nombre: "Pets Excellence",
    ubicacion: "Escandón",
    direccion: "Antonio Macea 9, Escandón I Secc, Miguel Hidalgo, 11800 Alc Miguel Hidalgo, CDMX",
    coordenadas: {
      lat: 19.4053988,
      lng: -99.1834808
    },
    googleMapsUrl: "https://www.google.com.mx/maps/place/Pets+Excellence+Boutique+%26+Grooming/@19.4053988,-99.1860557,17z/data=!3m1!4b1!4m6!3m5!1s0x85d1ff0ee99458a3:0x406419b4b48bc6e!8m2!3d19.4053988!4d-99.1834808!16s%2Fg%2F11qg0dwcqk?hl=es&entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D",
    logo: "/tiendas/pets-excellence-logo.png",
    descripcion: "Boutique & Grooming especializada en el cuidado integral de mascotas.",
    horarios: "Lun - Vie: 9:00 - 19:00, Sab: 9:00 - 18:00",
    telefono: "+52 55 2345 6789"
  },
  {
    id: "llaos-pet-condesa",
    nombre: "Llaos Pet",
    ubicacion: "Condesa",
    direccion: "Calle Juan Escutia 89, Colonia Condesa, Cuauhtémoc, 06140 Ciudad de México, CDMX",
    coordenadas: {
      lat: 19.4156189,
      lng: -99.1760746
    },
    googleMapsUrl: "https://www.google.com.mx/maps/place/Llaos+Pet+Condesa+Est%C3%A9tica+Canina+Spa+de+Perritos+y+Gatitos/@19.4156189,-99.1786495,17z/data=!3m1!4b1!4m6!3m5!1s0x85d1ff377e85dce1:0xf1b8ae13915a810e!8m2!3d19.4156189!4d-99.1760746!16s%2Fg%2F11fm5wz5y6?hl=es&entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D",
    logo: "/tiendas/llaos-pet-logo.png",
    descripcion: "Estética Canina & Spa especializado en el cuidado y bienestar de perritos y gatitos.",
    horarios: "Lun - Dom: 10:00 - 19:00",
    telefono: "+52 55 3456 7890"
  },
  {
    id: "llaos-pet-roma-norte",
    nombre: "Llaos Pet",
    ubicacion: "Roma Norte",
    direccion: "Durango 127, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX",
    coordenadas: {
      lat: 19.4208159,
      lng: -99.1624054
    },
    googleMapsUrl: "https://www.google.com.mx/maps/place/Llaos+Pet/@19.4208159,-99.1649803,17z/data=!3m1!4b1!4m6!3m5!1s0x85d1ff3752e2f531:0x43e4f49e86b04c96!8m2!3d19.4208159!4d-99.1624054!16s%2Fg%2F11bx5r36hf?hl=es&entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D",
    logo: "/tiendas/llaos-pet-logo.png",
    descripcion: "Sucursal Roma Norte de Llaos Pet, especializada en productos y servicios para mascotas.",
    horarios: "Lun - Dom: 10:00 - 19:00",
    telefono: "+52 55 4567 8901"
  }
]

export function TiendasProvider({ children }: { children: ReactNode }) {
  const [tiendas] = useState<Tienda[]>(tiendasData)
  const [selectedTienda, setSelectedTienda] = useState<Tienda | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular carga de datos
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const value: TiendasContextType = {
    tiendas,
    selectedTienda,
    setSelectedTienda,
    isLoading
  }

  return (
    <TiendasContext.Provider value={value}>
      {children}
    </TiendasContext.Provider>
  )
}

export function useTiendas() {
  const context = useContext(TiendasContext)
  if (context === undefined) {
    throw new Error("useTiendas must be used within a TiendasProvider")
  }
  return context
}
