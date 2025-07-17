"use client"

import { motion } from "framer-motion"

export default function TiendasHero() {
  return (
    <section className="relative bg-gradient-to-r from-primary to-primary/80 dark:from-primary dark:to-primary/90 text-white py-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/pattern-bg.svg')] opacity-10"></div>
      
      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full blur-lg animate-bounce"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Nuestras Boutiques Aliadas
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Encuentra los productos Pet Gourmet en las mejores boutiques especializadas de la Ciudad de México
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">4 Ubicaciones</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Calidad Garantizada</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Productos Frescos</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <h2 className="text-2xl font-semibold mb-4">Boutiques en CDMX</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4">
                <div className="text-3xl font-bold">Polanco</div>
                <div className="text-sm opacity-80">Pet Society</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold">Escandón</div>
                <div className="text-sm opacity-80">Pets Excellence</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold">Condesa</div>
                <div className="text-sm opacity-80">Llaos Pet</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold">Roma Norte</div>
                <div className="text-sm opacity-80">Llaos Pet</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
