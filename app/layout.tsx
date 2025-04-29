import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Baloo_2 } from "next/font/google"
import ClientLayout from "./ClientLayout"
import { ThemeProvider } from "@/components/theme-provider"

// Fuente principal para el contenido general
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
  // Cargar solo los pesos necesarios
  weight: ["400", "500", "600", "700"],
})

// Fuente llamativa similar al logo para títulos destacados
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "Pet Gourmet - Alimento Premium para Perros Felices",
  description:
    "Descubre nuestra gama de alimentos naturales y nutritivos para perros, elaborados con ingredientes de alta calidad para la salud y felicidad de tu mascota.",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#7AB8BF",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/petgourmet-logo.png" as="image" type="image/png" />
      </head>
      <body className={`${montserrat.variable} ${baloo.variable} font-sans`}>
        <ThemeProvider defaultTheme="light" storageKey="pet-gourmet-theme">
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'