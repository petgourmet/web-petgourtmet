// Script para inyectar JavaScript en la página y ejecutar la prueba automáticamente

console.log('🚀 Inyectando script de prueba en la página...');

// JavaScript que se ejecutará en el navegador
const browserScript = `
(function() {
  console.log('🧪 Script de prueba inyectado exitosamente');
  
  // Función para encontrar y hacer clic en el botón
  function executeTest() {
    console.log('🔍 Buscando botón de prueba...');
    
    // Buscar el botón por texto
    const buttons = Array.from(document.querySelectorAll('button'));
    const testButton = buttons.find(btn => 
      btn.textContent.includes('Ejecutar Prueba') || 
      btn.textContent.includes('▶️')
    );
    
    if (testButton) {
      console.log('✅ Botón encontrado:', testButton.textContent);
      console.log('🖱️ Haciendo clic en el botón...');
      
      // Hacer clic en el botón
      testButton.click();
      
      console.log('⏳ Esperando resultados de la prueba...');
      
      // Monitorear los resultados
      setTimeout(() => {
        console.log('🔍 Verificando resultados...');
        
        // Buscar elementos de resultado
        const resultElements = document.querySelectorAll('[class*="bg-gray-50"], [class*="bg-gray-900"], [class*="bg-green-100"], [class*="bg-yellow-100"], [class*="bg-red-100"]');
        
        if (resultElements.length > 0) {
          console.log('📊 Resultados encontrados:');
          resultElements.forEach((element, index) => {
            console.log(\`Resultado \${index + 1}:\`, element.textContent.trim());
          });
        } else {
          console.log('⚠️ No se encontraron resultados visibles');
        }
        
        // Buscar mensajes de éxito o error específicos
        const successMessages = document.querySelectorAll('[class*="text-green"], [class*="bg-green"]');
        const errorMessages = document.querySelectorAll('[class*="text-red"], [class*="bg-red"]');
        
        if (successMessages.length > 0) {
          console.log('✅ Mensajes de éxito encontrados:');
          successMessages.forEach(msg => console.log('  -', msg.textContent.trim()));
        }
        
        if (errorMessages.length > 0) {
          console.log('❌ Mensajes de error encontrados:');
          errorMessages.forEach(msg => console.log('  -', msg.textContent.trim()));
        }
        
      }, 3000);
      
    } else {
      console.log('❌ No se encontró el botón de prueba');
      console.log('🔍 Botones disponibles:');
      buttons.forEach((btn, index) => {
        console.log(\`  \${index + 1}. "\${btn.textContent.trim()}\"\`);
      });
    }
  }
  
  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeTest);
  } else {
    // Esperar un poco para que React termine de renderizar
    setTimeout(executeTest, 1000);
  }
  
})();
`;

console.log('📋 Script preparado para inyección:');
console.log('\n--- SCRIPT PARA COPIAR Y PEGAR EN LA CONSOLA DEL NAVEGADOR ---');
console.log(browserScript);
console.log('--- FIN DEL SCRIPT ---\n');

console.log('📝 Instrucciones:');
console.log('1. Abrir http://localhost:3000/test-subscription en el navegador');
console.log('2. Abrir las herramientas de desarrollador (F12)');
console.log('3. Ir a la pestaña "Console"');
console.log('4. Copiar y pegar el script de arriba');
console.log('5. Presionar Enter para ejecutar');
console.log('6. Observar los logs de la prueba');

console.log('\n🎯 El script automáticamente:');
console.log('   - Encontrará el botón de prueba');
console.log('   - Hará clic en él');
console.log('   - Monitoreará los resultados');
console.log('   - Mostrará los logs de la ejecución');