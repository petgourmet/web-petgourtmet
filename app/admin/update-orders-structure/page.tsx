'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UpdateOrdersStructurePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const checkStructure = async () => {
    try {
      const response = await fetch('/api/admin/check-orders-structure')
      const data = await response.json()
      console.log('Current structure:', data)
      setResults({ type: 'check', data })
    } catch (error) {
      console.error('Error checking structure:', error)
      setResults({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const updateStructure = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/update-orders-structure', {
        method: 'POST'
      })
      const data = await response.json()
      console.log('Update results:', data)
      setResults({ type: 'update', data })
    } catch (error) {
      console.error('Error updating structure:', error)
      setResults({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Update Orders Table Structure</h1>
      
      <div className="grid gap-4 mb-6">
        <Button onClick={checkStructure} variant="outline">
          Check Current Structure
        </Button>
        
        <Button onClick={updateStructure} disabled={loading}>
          {loading ? 'Updating...' : 'Update Table Structure'}
        </Button>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
