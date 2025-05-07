import Link from "next/link"
import Image from "next/image"
import { ThemedBackground } from "@/components/themed-background"

export default function VerifyPage() {
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
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Verifica tu correo electrónico</h2>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Hemos enviado un enlace de verificación a tu correo electrónico. Por favor, revisa tu bandeja de entrada y
              haz clic en el enlace para activar tu cuenta.
            </p>

            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Si no recibes el correo en unos minutos, revisa tu carpeta de spam o correo no deseado.
            </div>

            <div className="flex justify-center">
              <Link
                href="/auth/login"
                className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-md transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ThemedBackground>
  )
}
