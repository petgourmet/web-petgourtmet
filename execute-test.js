// Script para ejecutar automáticamente la prueba de suscripción
// Este script se ejecutará en el navegador para simular el clic del botón

console.log('🚀 Iniciando ejecución automática de la prueba de suscripción...');

// Función para esperar a que un elemento esté disponible
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function checkElement() {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Elemento ${selector} no encontrado después de ${timeout}ms`));
      } else {
        setTimeout(checkElement, 100);
      }
    }
    
    checkElement();
  });
}

// Función principal para ejecutar la prueba
async function executeTest() {
  try {
    console.log('🔍 Buscando el botón de prueba...');
    
    // Esperar a que el botón esté disponible
    const button = await waitForElement('button');
    
    if (button && button.textContent.includes('Ejecutar Prueba')) {
      console.log('✅ Botón encontrado, ejecutando prueba...');
      
      // Hacer clic en el botón
      button.click();
      
      console.log('🎯 Prueba iniciada. Esperando resultados...');
      
      // Esperar a que aparezcan los resultados
      setTimeout(() => {
        const resultDiv = document.querySelector('[class*="bg-gray-50"], [class*="bg-gray-900"]');
        if (resultDiv) {
          console.log('📊 Resultados de la prueba:');
          console.log(resultDiv.textContent);
        }
      }, 3000);
      
    } else {
      console.error('❌ No se encontró el botón de prueba');
    }
    
  } catch (error) {
    console.error('❌ Error al ejecutar la prueba:', error);
  }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', executeTest);
} else {
  executeTest();
}

// También ejecutar después de un pequeño delay para asegurar que React haya renderizado
setTimeout(executeTest, 1000);