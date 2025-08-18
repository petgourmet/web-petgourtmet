"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreatePlanPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Planes Personalizados para tu Mascota
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Descubre nuestros productos y suscripciones diseñadas especialmente para tu compañero peludo
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl text-teal-600">🛒 Compra Individual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Explora nuestra selección de productos premium para mascotas. Cada producto está cuidadosamente seleccionado para la nutrición y bienestar de tu mascota.
                </p>
                <Link href="/productos">
                  <Button className="w-full bg-teal-500 hover:bg-teal-600">
                    Ver Productos
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl text-orange-600">📅 Suscripciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Suscríbete a entregas regulares de los productos favoritos de tu mascota. Nunca te quedes sin su comida preferida.
                </p>
                <Link href="/suscripcion">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    Ver Suscripciones
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-teal-500 to-orange-500 text-white">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-4">¿Necesitas ayuda para elegir?</h2>
              <p className="mb-6 text-teal-50">
                Nuestro equipo está aquí para ayudarte a encontrar la mejor opción para tu mascota
              </p>
              <Link href="/contacto">
                <Button variant="secondary" className="bg-white text-teal-600 hover:bg-gray-100">
                  Contactar Asesor
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
