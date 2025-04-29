import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-baloo)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          brand: "#7AB8BF", // Azul (color principal en modo claro)
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          brand: "#8c4a23", // Marrón secundario
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          foreground: "hsl(var(--neutral-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          red: "#8c242b", // Rojo granate (PANTONE 7628C)
          amber: "#b67d1b", // Marrón/ámbar (PANTONE 7571C)
          peach: "#e7ae84", // Melocotón/beige (PANTONE 713C)
        },
        pastel: {
          blue: "hsl(var(--pastel-blue))",
          green: "hsl(var(--pastel-green))",
          yellow: "hsl(var(--pastel-yellow))",
          pink: "hsl(var(--pastel-pink))",
          purple: "hsl(var(--pastel-purple))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      keyframes: {
        // Mapeo de nombres de animaciones (las definiciones están en _animations.css)
        "fill-plate": {},
        "float-up": {},
        "slide-in": {},
        "pulse-soft": {},
        glow: {},
        shimmer: {},
        "spin-slow": {},
      },
      animation: {
        "fill-plate": "fill-plate 1.5s ease-out forwards",
        "float-up": "float-up 0.8s ease-out forwards",
        "slide-in": "slide-in 0.8s ease-out forwards",
        "pulse-soft": "pulse-soft 3s infinite ease-in-out",
        glow: "glow 3s infinite ease-in-out",
        shimmer: "shimmer 2s infinite linear",
        "spin-slow": "spin-slow 20s linear infinite",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        shimmer:
          "linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 20%, rgba(255, 255, 255, 0.5) 60%, rgba(255, 255, 255, 0))",
      },
      boxShadow: {
        "glow-blue": "0 0 15px 0px rgba(122, 184, 191, 0.5)",
        "glow-brown": "0 0 15px 0px rgba(140, 36, 43, 0.5)", // Rojo granate
        "glow-amber": "0 0 15px 0px rgba(182, 125, 27, 0.5)", // Marrón/ámbar
        "glow-peach": "0 0 15px 0px rgba(231, 174, 132, 0.5)", // Melocotón/beige
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
