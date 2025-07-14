import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verificar políticas actuales
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { schema_name: 'public', table_name: 'orders' })
      .select('*')
    
    return NextResponse.json({
      message: "RLS Policies Check",
      description: "Check current RLS policies for orders table",
      timestamp: new Date().toISOString(),
      policies: policiesError ? { error: policiesError } : policies,
      actions: [
        "POST /api/debug/rls-fix?action=disable-rls - Temporarily disable RLS",
        "POST /api/debug/rls-fix?action=create-policies - Create proper policies",
        "POST /api/debug/rls-fix?action=enable-rls - Re-enable RLS with policies"
      ]
    })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to check RLS policies",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const supabase = await createClient()
    
    const results: any = {
      timestamp: new Date().toISOString(),
      action,
      results: []
    }
    
    if (action === 'disable-rls') {
      // Temporalmente deshabilitar RLS para permitir insertar órdenes
      const { data, error } = await supabase
        .rpc('execute_sql', { 
          query: 'ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;' 
        })
      
      results.results.push({
        operation: 'disable_rls',
        success: !error,
        data,
        error
      })
      
    } else if (action === 'create-policies') {
      // Crear políticas adecuadas para la tabla orders
      const policies = [
        // Política para permitir insertar órdenes desde API
        `CREATE POLICY "Allow public insert orders" ON public.orders
         FOR INSERT WITH CHECK (true);`,
        
        // Política para permitir leer órdenes (para admin)
        `CREATE POLICY "Allow public select orders" ON public.orders
         FOR SELECT USING (true);`,
        
        // Política para permitir actualizar órdenes (para status de pago)
        `CREATE POLICY "Allow public update orders" ON public.orders
         FOR UPDATE USING (true);`
      ]
      
      for (const policy of policies) {
        const { data, error } = await supabase
          .rpc('execute_sql', { query: policy })
        
        results.results.push({
          operation: 'create_policy',
          query: policy,
          success: !error,
          data,
          error
        })
      }
      
    } else if (action === 'enable-rls') {
      // Habilitar RLS
      const { data, error } = await supabase
        .rpc('execute_sql', { 
          query: 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;' 
        })
      
      results.results.push({
        operation: 'enable_rls',
        success: !error,
        data,
        error
      })
      
    } else if (action === 'test-insert') {
      // Probar inserción después de cambios
      const testOrder = {
        id: `rls_test_${Date.now()}`,
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        total_amount: 299.00,
        status: 'pending',
        items: [{ name: 'Test Product', price: 299.00, quantity: 1 }],
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('orders')
        .insert(testOrder)
        .select('*')
      
      results.results.push({
        operation: 'test_insert',
        success: !error,
        data,
        error,
        test_order: testOrder
      })
      
      // Limpiar datos de prueba si se insertó correctamente
      if (!error && data) {
        await supabase
          .from('orders')
          .delete()
          .eq('id', testOrder.id)
      }
      
    } else {
      return NextResponse.json({
        error: "Unknown action",
        validActions: ["disable-rls", "create-policies", "enable-rls", "test-insert"]
      }, { status: 400 })
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    return NextResponse.json({
      error: "Failed to execute RLS action",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
