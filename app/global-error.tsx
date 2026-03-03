"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center px-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Algo salió mal
          </h2>
          <p className="text-gray-600 mb-6">
            Ocurrió un error inesperado. Por favor, intenta de nuevo.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[#7C3AED] text-white rounded-full font-medium hover:bg-[#6D28D9] transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
