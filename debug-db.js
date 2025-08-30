// Script para verificar los datos de la base de datos
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('🔍 Verificando datos de la base de datos...');
  
  try {
    // 1. Verificar algunos registros de order_items
    console.log('\n📦 Consultando order_items...');
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, product_name, product_image, quantity, price, size')
      .order('id', { ascending: false })
      .limit(10);
    
    if (orderItemsError) {
      console.error('❌ Error consultando order_items:', orderItemsError);
    } else {
      console.log('✅ Order items encontrados:', orderItems?.length || 0);
      orderItems?.forEach(item => {
        console.log(`  - ID: ${item.id}, Product ID: ${item.product_id}, Product Name: "${item.product_name}", Quantity: ${item.quantity}`);
      });
    }
    
    // 2. Verificar estadísticas de product_name
    console.log('\n📊 Verificando estadísticas de product_name...');
    const { data: allItems, error: allItemsError } = await supabase
      .from('order_items')
      .select('product_name');
    
    if (allItemsError) {
      console.error('❌ Error consultando todas las order_items:', allItemsError);
    } else {
      const total = allItems?.length || 0;
      const nullNames = allItems?.filter(item => item.product_name === null).length || 0;
      const emptyNames = allItems?.filter(item => item.product_name === '').length || 0;
      const validNames = allItems?.filter(item => item.product_name && item.product_name !== '').length || 0;
      
      console.log(`  - Total items: ${total}`);
      console.log(`  - Nombres NULL: ${nullNames}`);
      console.log(`  - Nombres vacíos: ${emptyNames}`);
      console.log(`  - Nombres válidos: ${validNames}`);
    }
    
    // 3. Verificar algunos productos
    console.log('\n🛍️ Consultando productos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, slug, price')
      .order('id')
      .limit(10);
    
    if (productsError) {
      console.error('❌ Error consultando productos:', productsError);
    } else {
      console.log('✅ Productos encontrados:', products?.length || 0);
      products?.forEach(product => {
        console.log(`  - ID: ${product.id}, Name: "${product.name}", Slug: ${product.slug}`);
      });
    }
    
    // 4. Verificar la relación entre order_items y products
    console.log('\n🔗 Verificando relación order_items <-> products...');
    const { data: joinData, error: joinError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        product_name,
        quantity,
        price,
        products (
          id,
          name
        )
      `)
      .order('id', { ascending: false })
      .limit(10);
    
    if (joinError) {
      console.error('❌ Error en consulta JOIN:', joinError);
    } else {
      console.log('✅ Datos con JOIN encontrados:', joinData?.length || 0);
      joinData?.forEach(item => {
        console.log(`  - Order Item ID: ${item.id}`);
        console.log(`    Product ID: ${item.product_id}`);
        console.log(`    Order Item Product Name: "${item.product_name}"`);
        console.log(`    Products Table Name: "${item.products?.name || 'N/A'}"`);
        console.log(`    ---`);
      });
    }
    
    // 5. Verificar órdenes recientes
    console.log('\n📋 Consultando órdenes recientes...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        total,
        created_at,
        order_items (
          id,
          product_name,
          quantity,
          price
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Error consultando órdenes:', ordersError);
    } else {
      console.log('✅ Órdenes encontradas:', orders?.length || 0);
      orders?.forEach(order => {
        console.log(`  - Order ID: ${order.id}, Status: ${order.status}, Total: ${order.total}`);
        order.order_items?.forEach(item => {
          console.log(`    * Item: "${item.product_name}", Qty: ${item.quantity}, Price: ${item.price}`);
        });
      });
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

debugDatabase().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error ejecutando script:', error);
  process.exit(1);
});