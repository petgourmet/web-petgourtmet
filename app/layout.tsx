import type React from "react"
import type { Metadata, Viewport } from "next"
import { Montserrat, Baloo_2 } from "next/font/google"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { ThemeProvider } from "@/components/theme-provider"
import { GoogleAnalytics } from "@/components/google-analytics"
import { FacebookPixel } from "@/components/facebook-pixel"
import { StructuredData } from "@/components/structured-data"
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/google-tag-manager"
// import { RecaptchaProvider } from "@/contexts/RecaptchaProvider"

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7AB8BF',
}

export const metadata: Metadata = {
  title: {
    default: "Pet Gourmet - Alimento Premium para Perros Felices",
    template: "%s | Pet Gourmet"
  },
  description:
    "Descubre nuestra gama de alimentos naturales y nutritivos para perros, elaborados con ingredientes de alta calidad para la salud y felicidad de tu mascota.",
  keywords: [
    "pet gourmet",
    "alimento para perros",
    "comida premium mascotas",
    "alimentación natural",
    "snacks para perros",
    "premios para mascotas",
    "comida casera para perros",
    "nutrición canina",
    "alimento natural perros",
    "comida saludable mascotas"
  ],
  authors: [{ name: "Pet Gourmet" }],
  creator: "Pet Gourmet",
  publisher: "Pet Gourmet",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
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
    creator: "@petgourmet",
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: "/",
  },
  category: "pets",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${montserrat.variable} ${baloo.variable} font-sans m-0 p-0 overflow-x-hidden`}>
        <GoogleTagManagerNoScript />
        <GoogleTagManager />
        <GoogleAnalytics />
        <FacebookPixel />
        <StructuredData type="organization" />
        <StructuredData type="website" />
        <StructuredData type="breadcrumb" />
        <ThemeProvider defaultTheme="light" storageKey="pet-gourmet-theme">
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
