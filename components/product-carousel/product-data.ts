export interface Product {
  id: string
  name: string
  subtitle: string
  description: string
  image: string
  variant?: string
  ingredients: {
    icon: string
    name: string
  }[]
  nutritionData: {
    protein: number
    moisture: number
    fat: number
    ash: number
    fiber: number
    calories: number
  }
  category: "celebrar" | "complementar" | "premiar" | "recetas"
}

export const products: Product[] = [
  {
    id: "meat-festival",
    name: "Meat Festival",
    subtitle: "a base de res",
    description:
      "Llena de nutrientes y aminoácidos esenciales para un bienestar integral, con un aporte extra de zinc y hierro. Fortalece el sistema inmunológico y aporta más energía.",
    image: "/pastel-carne-package.png",
    variant: "res",
    ingredients: [
      { icon: "/juicy-steak-icon.png", name: "Res" },
      { icon: "/golden-grain-icon.png", name: "Cereales" },
      { icon: "/assorted-vegetables-icon.png", name: "Vegetales" },
    ],
    nutritionData: {
      protein: 60.0,
      moisture: 21.0,
      fat: 14.2,
      ash: 11.9,
      fiber: 7.14,
      calories: 1150,
    },
    category: "recetas",
  },
  {
    id: "chicken-chase",
    name: "Chicken Chase",
    subtitle: "a base de pollo",
    description:
      "Con bajo índice glucémico y alto contenido de proteínas, fortalece los músculos, promueve la salud intestinal y es suave para el estómago de tu peludo.",
    image: "/savory-chicken-bites.png",
    variant: "pollo",
    ingredients: [
      { icon: "/stylized-chicken-icon.png", name: "Pollo" },
      { icon: "/placeholder.svg?height=32&width=32&query=rice icon", name: "Arroz" },
      { icon: "/placeholder.svg?height=32&width=32&query=carrot icon", name: "Zanahoria" },
    ],
    nutritionData: {
      protein: 60.0,
      moisture: 21.0,
      fat: 10.9,
      ash: 11.9,
      fiber: 7.14,
      calories: 1150,
    },
    category: "recetas",
  },
  {
    id: "tasty-piggy",
    name: "Tasty Piggy",
    subtitle: "a base de cerdo",
    description:
      "Con un alto contenido de proteínas de gran valor biológico y presencia de vitaminas, minerales y ácidos grasos, que favorecen la salud cognitiva y muscular.",
    image: "/placeholder.svg?height=300&width=200&query=pork dog food package",
    variant: "cerdo",
    ingredients: [
      { icon: "/placeholder.svg?height=32&width=32&query=pork icon", name: "Cerdo" },
      { icon: "/placeholder.svg?height=32&width=32&query=pea icon", name: "Guisantes" },
      { icon: "/placeholder.svg?height=32&width=32&query=apple icon", name: "Manzana" },
    ],
    nutritionData: {
      protein: 60.0,
      moisture: 21.0,
      fat: 11.9,
      ash: 11.9,
      fiber: 7.14,
      calories: 1150,
    },
    category: "recetas",
  },
  {
    id: "birthday-cake",
    name: "Birthday Cake",
    subtitle: "para celebraciones",
    description:
      "Especialmente formulado para celebrar momentos especiales con tu mascota. Delicioso y nutritivo, hará que cualquier ocasión sea inolvidable.",
    image: "/happy-dog-birthday.png",
    ingredients: [
      { icon: "/placeholder.svg?height=32&width=32&query=cake icon", name: "Pastel" },
      { icon: "/placeholder.svg?height=32&width=32&query=yogurt icon", name: "Yogur" },
      { icon: "/placeholder.svg?height=32&width=32&query=honey icon", name: "Miel" },
    ],
    nutritionData: {
      protein: 55.0,
      moisture: 22.0,
      fat: 15.0,
      ash: 10.0,
      fiber: 6.0,
      calories: 1200,
    },
    category: "celebrar",
  },
  {
    id: "vitamin-boost",
    name: "Vitamin Boost",
    subtitle: "suplemento diario",
    description:
      "Complemento nutricional rico en vitaminas y minerales esenciales para fortalecer el sistema inmunológico y mejorar la salud general de tu mascota.",
    image: "/dog-supplement-display.png",
    ingredients: [
      { icon: "/placeholder.svg?height=32&width=32&query=vitamin icon", name: "Vitaminas" },
      { icon: "/placeholder.svg?height=32&width=32&query=mineral icon", name: "Minerales" },
      { icon: "/placeholder.svg?height=32&width=32&query=omega3 icon", name: "Omega 3" },
    ],
    nutritionData: {
      protein: 50.0,
      moisture: 15.0,
      fat: 20.0,
      ash: 10.0,
      fiber: 5.0,
      calories: 1000,
    },
    category: "complementar",
  },
  {
    id: "training-treats",
    name: "Training Treats",
    subtitle: "premios de entrenamiento",
    description:
      "Pequeños bocados perfectos para el entrenamiento y refuerzo positivo. Bajos en calorías pero irresistibles para tu mascota.",
    image: "/healthy-dog-training-treats.png",
    ingredients: [
      { icon: "/stylized-chicken-icon.png", name: "Pollo" },
      { icon: "/placeholder.svg?height=32&width=32&query=liver icon", name: "Hígado" },
      { icon: "/placeholder.svg?height=32&width=32&query=pumpkin icon", name: "Calabaza" },
    ],
    nutritionData: {
      protein: 65.0,
      moisture: 18.0,
      fat: 10.0,
      ash: 9.0,
      fiber: 8.0,
      calories: 950,
    },
    category: "premiar",
  },
]
