import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando diagnóstico de productos...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'NO CONFIGURADO',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'NO CONFIGURADO',
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'NO CONFIGURADO',
      },
      tests: {}
    };

    // Test 1: Conexión básica con Supabase
    console.log('📡 Probando conexión básica con Supabase...');
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('products')
        .select('count', { count: 'exact', head: true });
      
      if (connectionError) {
        diagnostics.tests.connection = {
          status: 'ERROR',
          error: connectionError.message,
          details: connectionError
        };
      } else {
        diagnostics.tests.connection = {
          status: 'OK',
          message: 'Conexión exitosa con Supabase'
        };
      }
    } catch (error) {
      diagnostics.tests.connection = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: error
      };
    }

    // Test 2: Verificar existencia de tabla products
    console.log('🗃️ Verificando tabla products...');
    try {
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from('products')
        .select('*')
        .limit(5);
      
      if (productsError) {
        diagnostics.tests.productsTable = {
          status: 'ERROR',
          error: productsError.message,
          details: productsError
        };
      } else {
        diagnostics.tests.productsTable = {
          status: 'OK',
          count: productsData?.length || 0,
          sampleData: productsData?.slice(0, 2) || [],
          message: `Tabla products encontrada con ${productsData?.length || 0} registros`
        };
      }
    } catch (error) {
      diagnostics.tests.productsTable = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: error
      };
    }

    // Test 3: Verificar existencia de tabla categories
    console.log('📂 Verificando tabla categories...');
    try {
      const { data: categoriesData, error: categoriesError } = await supabaseAdmin
        .from('categories')
        .select('*')
        .limit(5);
      
      if (categoriesError) {
        diagnostics.tests.categoriesTable = {
          status: 'ERROR',
          error: categoriesError.message,
          details: categoriesError
        };
      } else {
        diagnostics.tests.categoriesTable = {
          status: 'OK',
          count: categoriesData?.length || 0,
          sampleData: categoriesData?.slice(0, 2) || [],
          message: `Tabla categories encontrada con ${categoriesData?.length || 0} registros`
        };
      }
    } catch (error) {
      diagnostics.tests.categoriesTable = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: error
      };
    }

    // Test 4: Probar consulta completa como en la página de productos
    console.log('🔄 Probando consulta completa de productos...');
    try {
      const { data: fullQueryData, error: fullQueryError } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .gt('stock', 0)
        .order('created_at', { ascending: false });
      
      if (fullQueryError) {
        diagnostics.tests.fullQuery = {
          status: 'ERROR',
          error: fullQueryError.message,
          details: fullQueryError
        };
      } else {
        diagnostics.tests.fullQuery = {
          status: 'OK',
          count: fullQueryData?.length || 0,
          sampleData: fullQueryData?.slice(0, 1) || [],
          message: `Consulta completa exitosa con ${fullQueryData?.length || 0} productos activos`
        };
      }
    } catch (error) {
      diagnostics.tests.fullQuery = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: error
      };
    }

    // Resumen del diagnóstico
    const hasErrors = Object.values(diagnostics.tests).some((test: any) => test.status === 'ERROR');
    
    console.log('📊 Diagnóstico completado:', {
      hasErrors,
      tests: Object.keys(diagnostics.tests).length
    });

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Se encontraron errores en el diagnóstico' : 'Diagnóstico completado exitosamente',
      diagnostics
    }, { 
      status: hasErrors ? 500 : 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error crítico en el diagnóstico',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: error
    }, { status: 500 });
  }
}