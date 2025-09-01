"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"

export default function TestAuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testSignUp = async () => {
    setLoading(true)
    setResult("")
    
    try {
      console.log("Intentando registrar usuario con:", { email, password: "***" })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      console.log("Respuesta de signUp:", { data, error })
      
      if (error) {
        setResult(`Error: ${error.message}`)
      } else {
        setResult(`Éxito: Usuario registrado. ID: ${data.user?.id}, Email confirmado: ${data.user?.email_confirmed_at ? 'Sí' : 'No'}`)
      }
    } catch (err: any) {
      console.error("Error capturado:", err)
      setResult(`Error capturado: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setResult("")
    
    try {
      console.log("Probando conexión a Supabase...")
      
      const { data, error } = await supabase.auth.getSession()
      
      console.log("Respuesta de getSession:", { data, error })
      
      if (error) {
        setResult(`Error de conexión: ${error.message}`)
      } else {
        setResult(`Conexión exitosa. Sesión activa: ${data.session ? 'Sí' : 'No'}`)
      }
    } catch (err: any) {
      console.error("Error de conexión:", err)
      setResult(`Error de conexión: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Prueba de Autenticación</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="mínimo 6 caracteres"
            />
          </div>
          
          <div className="space-y-2">
            <button
              onClick={testConnection}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
            >
              {loading ? "Probando..." : "Probar Conexión"}
            </button>
            
            <button
              onClick={testSignUp}
              disabled={loading || !email || !password}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
            >
              {loading ? "Registrando..." : "Probar Registro"}
            </button>
          </div>
          
          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <h3 className="font-medium mb-2">Resultado:</h3>
              <p className="text-sm whitespace-pre-wrap">{result}</p>
            </div>
          )}
          
          <div className="mt-6 text-xs text-gray-500">
            <p><strong>URL actual:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p><strong>Variables de entorno:</strong></p>
            <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Configurada' : '✗ No configurada'}</p>
            <p>SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Configurada' : '✗ No configurada'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}