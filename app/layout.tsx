import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Baloo_2 } from "next/font/google"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { ThemeProvider } from "@/components/theme-provider"

// Fuente principal para el contenido general
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Pet Gourmet - Alimento Premium para Perros Felices",
    description:
      "Descubre nuestra gama de alimentos naturales y nutritivos para perros, elaborados con ingredientes de alta calidad para la salud y felicidad de tu mascota.",
    url: "/",
    siteName: "Pet Gourmet",
    images: [
      {
        url: "/petgourmet-logo.png",
        width: 1200,
        height: 630,
        alt: "Pet Gourmet Logo",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pet Gourmet - Alimento Premium para Perros Felices",
    description:
      "Descubre nuestra gama de alimentos naturales y nutritivos para perros, elaborados con ingredientes de alta calidad para la salud y felicidad de tu mascota.",
    images: ["/petgourmet-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${montserrat.variable} ${baloo.variable} font-sans m-0 p-0 overflow-x-hidden`}>
        <ThemeProvider defaultTheme="light" storageKey="pet-gourmet-theme">
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
