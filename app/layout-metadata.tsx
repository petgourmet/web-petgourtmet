import type { Metadata, Viewport } from "next/types"

export const metadata: Metadata = {
  title: {
    default: "Pet Gourmet - Alimentación natural para mascotas",
    template: "%s | Pet Gourmet",
  },
  description:
    "Descubre Pet Gourmet, la mejor alimentación natural para tu mascota. Comida casera, snacks y premios 100% naturales.",
  keywords: [
    "pet gourmet",
    "comida para mascotas",
    "alimentación natural",
    "snacks para perros",
    "premios para mascotas",
    "comida casera para perros",
  ],
  authors: [{ name: "Pet Gourmet" }],
  creator: "Pet Gourmet",
  publisher: "Pet Gourmet",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://petgourmet.com",
    title: "Pet Gourmet - Alimentación natural para mascotas",
    description:
      "Descubre Pet Gourmet, la mejor alimentación natural para tu mascota. Comida casera, snacks y premios 100% naturales.",
    siteName: "Pet Gourmet",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pet Gourmet - Alimentación natural para mascotas",
    description:
      "Descubre Pet Gourmet, la mejor alimentación natural para tu mascota. Comida casera, snacks y premios 100% naturales.",
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
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
}
