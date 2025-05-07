import Link from "next/link"
import Image from "next/image"
import { ThemedBackground } from "@/components/themed-background"

export default function UnauthorizedPage() {
  return (
    <ThemedBackground theme="default">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 flex justify-center">
            <Link href="/" className="block relative">
              <Image
                src="/petgourmet-logo.png"
                alt="Pet Gourmet Logo"
                width={180}
                height={60}
                className="h-16 w-auto"
              />
            </Link>
          </div>

          <div className="p-6 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Acceso No Autorizado</h2>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
              No tienes permisos para acceder a esta página. Si crees que esto es un error, por favor contacta al
              administrador.
            </p>

            <div className="flex justify-center">
              <Link
                href="/"
                className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-md transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
