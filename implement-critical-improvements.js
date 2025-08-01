require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function implementCriticalImprovements() {
  console.log('🚀 IMPLEMENTANDO MEJORAS CRÍTICAS PARA PRODUCCIÓN');
  console.log('=' .repeat(70));
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-MX')}`);
  console.log('=' .repeat(70));
  
  try {
    // ========================================
    // 1. CREAR USUARIOS DE PRUEBA ADICIONALES
    // ========================================
    console.log('\n👥 1. CREANDO USUARIOS DE PRUEBA ADICIONALES');
    console.log('-'.repeat(50));
    
    const testUsers = [
      {
        email: 'usuario1@petgourmet.mx',
        full_name: 'María González',
        role: 'user',
        phone: '+52 55 1234 5678',
        address: 'Av. Reforma 123, CDMX'
      },
      {
        email: 'usuario2@petgourmet.mx',
        full_name: 'Carlos Rodríguez',
        role: 'user',
        phone: '+52 55 2345 6789',
        address: 'Calle Insurgentes 456, CDMX'
      },
      {
        email: 'usuario3@petgourmet.mx',
        full_name: 'Ana Martínez',
        role: 'user',
        phone: '+52 55 3456 7890',
        address: 'Av. Universidad 789, CDMX'
      },
      {
        email: 'moderador@petgourmet.mx',
        full_name: 'Luis Moderador',
        role: 'moderator',
        phone: '+52 55 4567 8901',
        address: 'Calle Madero 321, CDMX'
      },
      {
        email: 'soporte@petgourmet.mx',
        full_name: 'Elena Soporte',
        role: 'support',
        phone: '+52 55 5678 9012',
        address: 'Av. Juárez 654, CDMX'
      }
    ];
    
    for (const user of testUsers) {
      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (!existingUser) {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            phone: user.phone,
            address: user.address,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.log(`❌ Error creando usuario ${user.email}:`, error.message);
        } else {
          console.log(`✅ Usuario creado: ${user.email} (${user.role})`);
        }
      } else {
        console.log(`ℹ️ Usuario ya existe: ${user.email}`);
      }
    }
    
    // ========================================
    // 2. CREAR SUSCRIPCIONES DE PRUEBA ADICIONALES
    // ========================================
    console.log('\n🔄 2. CREANDO SUSCRIPCIONES DE PRUEBA ADICIONALES');
    console.log('-'.repeat(50));
    
    // Obtener usuarios y productos disponibles
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('subscription_available', true)
      .limit(5);
    
    if (users && products && users.length > 0 && products.length > 0) {
      const subscriptionStatuses = ['active', 'paused', 'cancelled', 'pending'];
      const subscriptionTypes = ['monthly', 'quarterly', 'annual'];
      
      for (let i = 0; i < 8; i++) {
        const user = users[i % users.length];
        const product = products[i % products.length];
        const status = subscriptionStatuses[i % subscriptionStatuses.length];
        const type = subscriptionTypes[i % subscriptionTypes.length];
        
        // Verificar si ya existe una suscripción para este usuario y producto
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .single();
        
        if (!existingSub) {
          const basePrice = parseFloat(product.price);
          const discountPercentage = type === 'monthly' ? (product.monthly_discount || 0) :
                                   type === 'quarterly' ? (product.quarterly_discount || 0) :
                                   (product.annual_discount || 0);
          
          const discountedPrice = basePrice * (1 - discountPercentage / 100);
          
          const nextBillingDate = new Date();
          if (type === 'monthly') nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          else if (type === 'quarterly') nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          else nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          
          // Para suscripciones canceladas o pausadas, usar fecha pasada
          if (status === 'cancelled' || status === 'paused') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() - 1);
          }
          
          const { data, error } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: user.id,
              product_id: product.id,
              subscription_type: type,
              status: status,
              quantity: Math.floor(Math.random() * 3) + 1,
              size: product.sizes ? product.sizes[0] : 'medium',
              discount_percentage: discountPercentage,
              base_price: basePrice,
              discounted_price: discountedPrice,
              next_billing_date: nextBillingDate.toISOString(), // Siempre incluir fecha
              product_name: product.name,
              product_image: product.image_url,
              frequency: type === 'monthly' ? 1 : type === 'quarterly' ? 3 : 12,
              frequency_type: 'months',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (error) {
            console.log(`❌ Error creando suscripción para ${user.email}:`, error.message);
          } else {
            console.log(`✅ Suscripción creada: ${user.email} → ${product.name} (${status})`);
          }
        } else {
          console.log(`ℹ️ Suscripción ya existe: ${user.email} → ${product.name}`);
        }
      }
    }
    
    // ========================================
    // 3. CREAR ÓRDENES Y HISTORIAL DE FACTURACIÓN
    // ========================================
    console.log('\n💳 3. CREANDO ÓRDENES Y HISTORIAL DE FACTURACIÓN');
    console.log('-'.repeat(50));
    
    // Obtener suscripciones activas para crear historial
    const { data: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active');
    
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      for (const subscription of activeSubscriptions.slice(0, 5)) {
        // Crear orden para la suscripción
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: subscription.user_id,
            total: subscription.discounted_price,
            payment_status: 'paid',
            payment_method: 'mercadopago',
            shipping_address: 'Dirección de prueba',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!orderError && order) {
          // Crear item de orden
          await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_id: subscription.product_id,
              quantity: subscription.quantity,
              price: subscription.discounted_price,
              size: subscription.size,
              created_at: new Date().toISOString()
            });
          
          // Crear historial de facturación
          const { error: billingError } = await supabase
            .from('subscription_billing_history')
            .insert({
              subscription_id: subscription.id,
              order_id: order.id,
              amount: subscription.discounted_price,
              billing_date: new Date().toISOString(),
              status: 'completed',
              payment_method: 'mercadopago',
              created_at: new Date().toISOString()
            });
          
          if (!billingError) {
            console.log(`✅ Historial de facturación creado para suscripción ${subscription.id}`);
          } else {
            console.log(`❌ Error en historial de facturación:`, billingError.message);
          }
        }
      }
    }
    
    // ========================================
    // 4. VERIFICAR MEJORAS IMPLEMENTADAS
    // ========================================
    console.log('\n📊 4. VERIFICANDO MEJORAS IMPLEMENTADAS');
    console.log('-'.repeat(50));
    
    // Contar usuarios
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Contar suscripciones por estado
    const { data: subscriptionStats } = await supabase
      .from('user_subscriptions')
      .select('status');
    
    const statusCounts = subscriptionStats?.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {}) || {};
    
    // Contar historial de facturación
    const { count: billingCount } = await supabase
      .from('subscription_billing_history')
      .select('*', { count: 'exact', head: true });
    
    // Contar órdenes pagadas
    const { count: paidOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid');
    
    console.log('\n📈 ESTADÍSTICAS ACTUALIZADAS:');
    console.log(`👥 Total de usuarios: ${userCount}`);
    console.log(`🔄 Suscripciones por estado:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    console.log(`💳 Órdenes pagadas: ${paidOrdersCount}`);
    console.log(`📋 Registros de facturación: ${billingCount}`);
    
    // ========================================
    // 5. RECOMENDACIONES FINALES
    // ========================================
    console.log('\n🎯 5. RECOMENDACIONES FINALES');
    console.log('-'.repeat(50));
    
    const improvements = {
      users: userCount >= 5,
      subscriptions: Object.values(statusCounts).reduce((a, b) => a + b, 0) >= 10,
      billing: billingCount >= 5,
      orders: paidOrdersCount >= 10
    };
    
    const completedImprovements = Object.values(improvements).filter(Boolean).length;
    const totalImprovements = Object.keys(improvements).length;
    const improvementPercentage = (completedImprovements / totalImprovements) * 100;
    
    console.log(`\n📊 PROGRESO DE MEJORAS: ${completedImprovements}/${totalImprovements} (${improvementPercentage.toFixed(1)}%)`);
    
    if (improvements.users) console.log('✅ Usuarios suficientes para pruebas');
    else console.log('❌ Necesita más usuarios de prueba');
    
    if (improvements.subscriptions) console.log('✅ Suscripciones suficientes para pruebas');
    else console.log('❌ Necesita más suscripciones de prueba');
    
    if (improvements.billing) console.log('✅ Historial de facturación adecuado');
    else console.log('❌ Necesita más registros de facturación');
    
    if (improvements.orders) console.log('✅ Órdenes suficientes para pruebas');
    else console.log('❌ Necesita más órdenes de prueba');
    
    console.log('\n🚀 PRÓXIMOS PASOS:');
    if (improvementPercentage >= 75) {
      console.log('✅ Datos de prueba suficientes - Proceder con pruebas de integración');
      console.log('✅ Configurar entorno de staging');
      console.log('✅ Realizar pruebas de carga');
    } else {
      console.log('⚠️ Ejecutar este script nuevamente para completar datos');
      console.log('⚠️ Verificar configuración de base de datos');
    }
    
    console.log('\n🎉 MEJORAS CRÍTICAS IMPLEMENTADAS');
    console.log(`📅 ${new Date().toLocaleString('es-MX')}`);
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('💥 Error durante la implementación:', error);
  }
}

implementCriticalImprovements().catch(console.error);