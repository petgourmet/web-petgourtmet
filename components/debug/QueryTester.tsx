"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useClientAuth } from "@/hooks/use-client-auth"

interface QueryResult {
  success: boolean
  data?: any
  error?: string
  executionTime: number
  timestamp: string
}

interface TestQuery {
  name: string
  description: string
  query: string
  table: string
}

const predefinedQueries: TestQuery[] = [
  {
    name: "Perfil del Usuario",
    description: "Obtiene el perfil del usuario autenticado",
    query: "SELECT * FROM profiles WHERE id = auth.uid()",
    table: "profiles"
  },
  {
    name: "Órdenes del Usuario",
    description: "Obtiene todas las órdenes del usuario",
    query: "SELECT * FROM orders WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 10",
    table: "orders"
  },
  {
    name: "Suscripciones del Usuario",
    description: "Obtiene las suscripciones activas del usuario",
    query: "SELECT * FROM subscriptions WHERE user_id = auth.uid() AND status = 'active'",
    table: "subscriptions"
  },
  {
    name: "Productos Disponibles",
    description: "Lista todos los productos disponibles",
    query: "SELECT id, name, price, stock FROM products WHERE stock > 0 LIMIT 10",
    table: "products"
  },
  {
    name: "Blogs Publicados",
    description: "Obtiene los blogs publicados más recientes",
    query: "SELECT id, title, created_at FROM blogs WHERE published = true ORDER BY created_at DESC LIMIT 5",
    table: "blogs"
  }
]

export default function QueryTester() {
  const { user, loading } = useClientAuth()
  const [customQuery, setCustomQuery] = useState("")
  const [results, setResults] = useState<QueryResult[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedTable, setSelectedTable] = useState("profiles")

  const executeQuery = async (query: string, queryName: string = "Consulta personalizada") => {
    if (!query.trim()) return

    setIsExecuting(true)
    const startTime = Date.now()
    const supabase = createClient()

    try {
      console.log(`🔍 Ejecutando consulta: ${queryName}`, { query, user: user?.id })
      
      // Ejecutar la consulta usando rpc si es necesario, o directamente
      let result
      if (query.includes('auth.uid()')) {
        // Para consultas que usan auth.uid(), usar el método directo
        const tableName = query.match(/FROM\s+(\w+)/i)?.[1]
        if (tableName) {
          if (query.toLowerCase().includes('select *')) {
            result = await supabase.from(tableName).select('*')
          } else {
            // Para consultas más complejas, usar rpc
            result = await supabase.rpc('execute_sql', { sql: query })
          }
        } else {
          throw new Error('No se pudo determinar la tabla de la consulta')
        }
      } else {
        // Para consultas simples sin auth.uid()
        const tableName = query.match(/FROM\s+(\w+)/i)?.[1]
        if (tableName) {
          result = await supabase.from(tableName).select('*')
        } else {
          throw new Error('No se pudo determinar la tabla de la consulta')
        }
      }

      const executionTime = Date.now() - startTime
      
      const queryResult: QueryResult = {
        success: !result.error,
        data: result.data,
        error: result.error?.message,
        executionTime,
        timestamp: new Date().toISOString()
      }

      console.log(`✅ Consulta ejecutada: ${queryName}`, {
        success: queryResult.success,
        recordCount: result.data?.length || 0,
        executionTime,
        error: result.error?.message
      })

      setResults(prev => [{
        ...queryResult,
        data: { query: queryName, ...queryResult }
      }, ...prev.slice(0, 9)]) // Mantener solo los últimos 10 resultados

    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      console.error(`❌ Error ejecutando consulta: ${queryName}`, error)
      
      setResults(prev => [{
        success: false,
        error: errorMessage,
        executionTime,
        timestamp: new Date().toISOString(),
        data: { query: queryName, error: errorMessage }
      }, ...prev.slice(0, 9)])
    } finally {
      setIsExecuting(false)
    }
  }

  const executeCustomQuery = () => {
    executeQuery(customQuery, "Consulta personalizada")
  }

  const executePredefinedQuery = (testQuery: TestQuery) => {
    executeQuery(testQuery.query, testQuery.name)
  }

  const clearResults = () => {
    setResults([])
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando tester de consultas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Tester de Consultas en Tiempo Real
          <Badge variant={user ? "default" : "destructive"}>
            {user ? `Usuario: ${user.email}` : "No autenticado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="predefined" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predefined">Consultas Predefinidas</TabsTrigger>
            <TabsTrigger value="custom">Consulta Personalizada</TabsTrigger>
          </TabsList>
          
          <TabsContent value="predefined" className="space-y-4">
            <div className="grid gap-2">
              {predefinedQueries.map((testQuery, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{testQuery.name}</h4>
                    <p className="text-sm text-gray-600">{testQuery.description}</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">
                      {testQuery.query}
                    </code>
                  </div>
                  <Button
                    onClick={() => executePredefinedQuery(testQuery)}
                    disabled={isExecuting}
                    size="sm"
                  >
                    {isExecuting ? "Ejecutando..." : "Ejecutar"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Consulta SQL personalizada:</label>
              <Textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="SELECT * FROM profiles WHERE id = auth.uid()"
                rows={4}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={executeCustomQuery}
                  disabled={isExecuting || !customQuery.trim()}
                >
                  {isExecuting ? "Ejecutando..." : "Ejecutar Consulta"}
                </Button>
                <Button
                  onClick={() => setCustomQuery("")}
                  variant="outline"
                  disabled={isExecuting}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Resultados ({results.length})</h3>
              <Button onClick={clearResults} variant="outline" size="sm">
                Limpiar Resultados
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className={`p-4 border rounded-lg ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "✅ Éxito" : "❌ Error"}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {result.executionTime}ms - {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {result.success ? (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Registros encontrados: {Array.isArray(result.data) ? result.data.length : 'N/A'}
                      </p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-red-700">
                      <p className="font-medium">Error:</p>
                      <p className="text-sm">{result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}