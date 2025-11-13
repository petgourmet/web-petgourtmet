/**
 * GTM Validator Bookmarklet
 * 
 * INSTRUCCIONES DE USO:
 * 
 * 1. Copia TODO el código de este archivo
 * 2. Ve a Chrome → Marcadores → Administrador de marcadores (Ctrl+Shift+O)
 * 3. Haz clic derecho → "Agregar nueva marcador"
 * 4. Nombre: "Validar GTM"
 * 5. URL: Pega el código que copiaste
 * 6. Guarda
 * 7. Visita cualquier página de tu sitio
 * 8. Haz clic en el marcador "Validar GTM"
 * 9. Se abrirá un panel con toda la información
 * 
 * ALTERNATIVA: Simplemente copia y pega en la consola
 */

javascript:(function(){
  // Crear estilos
  const styles = `
    #gtm-validator-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 450px;
      max-height: 80vh;
      background: white;
      border: 2px solid #7BBDC5;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    #gtm-validator-header {
      background: #7BBDC5;
      color: white;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    #gtm-validator-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    #gtm-validator-close {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      transition: background 0.2s;
    }
    
    #gtm-validator-close:hover {
      background: rgba(255,255,255,0.3);
    }
    
    #gtm-validator-content {
      padding: 20px;
      max-height: calc(80vh - 60px);
      overflow-y: auto;
    }
    
    .gtm-section {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .gtm-section:last-child {
      border-bottom: none;
    }
    
    .gtm-section h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }
    
    .gtm-status {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 5px 0;
      font-size: 13px;
    }
    
    .gtm-status.success {
      background: #d4edda;
      color: #155724;
    }
    
    .gtm-status.error {
      background: #f8d7da;
      color: #721c24;
    }
    
    .gtm-status.warning {
      background: #fff3cd;
      color: #856404;
    }
    
    .gtm-status-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    .gtm-code {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .gtm-button {
      background: #7BBDC5;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      margin: 5px 5px 5px 0;
      transition: background 0.2s;
    }
    
    .gtm-button:hover {
      background: #6aacb4;
    }
    
    .gtm-count {
      display: inline-block;
      background: #7BBDC5;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 5px;
    }
  `;
  
  // Inyectar estilos
  let styleEl = document.getElementById('gtm-validator-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'gtm-validator-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
  
  // Verificar GTM
  const gtmLoaded = !!(window.google_tag_manager && window.google_tag_manager['GTM-WMCL7Z6H']);
  const dataLayerExists = !!(window.dataLayer && Array.isArray(window.dataLayer));
  const dataLayerCount = window.dataLayer ? window.dataLayer.length : 0;
  const productEvents = window.dataLayer ? window.dataLayer.filter(e => e.productName || e.productNameC) : [];
  const lastEvent = window.dataLayer && window.dataLayer.length > 0 ? window.dataLayer[window.dataLayer.length - 1] : null;
  
  // Crear panel
  let panel = document.getElementById('gtm-validator-panel');
  if (panel) {
    panel.remove();
  }
  
  panel = document.createElement('div');
  panel.id = 'gtm-validator-panel';
  
  panel.innerHTML = `
    <div id="gtm-validator-header">
      <h3>🔍 Validador GTM</h3>
      <button id="gtm-validator-close">×</button>
    </div>
    <div id="gtm-validator-content">
      <div class="gtm-section">
        <h4>Estado de Google Tag Manager</h4>
        <div class="gtm-status ${gtmLoaded ? 'success' : 'error'}">
          <span class="gtm-status-icon">${gtmLoaded ? '✅' : '❌'}</span>
          <span>${gtmLoaded ? 'GTM cargado correctamente (GTM-WMCL7Z6H)' : 'GTM no detectado'}</span>
        </div>
        ${gtmLoaded ? `
          <button class="gtm-button" onclick="console.log('GTM Container:', window.google_tag_manager['GTM-WMCL7Z6H']); alert('Revisa la consola')">Ver en Consola</button>
        ` : ''}
      </div>
      
      <div class="gtm-section">
        <h4>Data Layer 
          <span class="gtm-count">${dataLayerCount} eventos</span>
        </h4>
        <div class="gtm-status ${dataLayerExists ? 'success' : 'error'}">
          <span class="gtm-status-icon">${dataLayerExists ? '✅' : '❌'}</span>
          <span>${dataLayerExists ? 'Data Layer inicializado' : 'Data Layer no encontrado'}</span>
        </div>
        ${dataLayerExists ? `
          <button class="gtm-button" onclick="console.table(window.dataLayer); alert('Revisa la consola')">Ver Todos</button>
          <button class="gtm-button" onclick="console.log('Último Evento:', window.dataLayer[window.dataLayer.length - 1]); alert('Revisa la consola')">Ver Último</button>
        ` : ''}
      </div>
      
      <div class="gtm-section">
        <h4>Eventos de Producto
          <span class="gtm-count">${productEvents.length}</span>
        </h4>
        <div class="gtm-status ${productEvents.length > 0 ? 'success' : 'warning'}">
          <span class="gtm-status-icon">${productEvents.length > 0 ? '✅' : '⚠️'}</span>
          <span>${productEvents.length > 0 ? 'Eventos de producto detectados' : 'No hay eventos de producto (visita un producto)'}</span>
        </div>
        ${productEvents.length > 0 ? `
          <button class="gtm-button" onclick="console.table(window.dataLayer.filter(e => e.productName || e.productNameC)); alert('Revisa la consola')">Ver Productos</button>
          <div class="gtm-code" style="margin-top: 10px;">
            <strong>Último producto:</strong><br>
            ${JSON.stringify(productEvents[productEvents.length - 1], null, 2)}
          </div>
        ` : ''}
      </div>
      
      ${lastEvent ? `
        <div class="gtm-section">
          <h4>Último Evento Registrado</h4>
          <div class="gtm-code">
            ${JSON.stringify(lastEvent, null, 2)}
          </div>
        </div>
      ` : ''}
      
      <div class="gtm-section">
        <h4>Acciones Rápidas</h4>
        <button class="gtm-button" onclick="
          window.dataLayer.push({
            event: 'test_product',
            productName: 'Producto de Prueba',
            productPrice: 299.99,
            productCategory: 'Test'
          });
          alert('✅ Evento de prueba enviado. Recarga este panel para verlo.');
        ">Enviar Evento de Prueba</button>
        
        <button class="gtm-button" onclick="
          const scripts = document.querySelectorAll('script[type=\\'application/ld+json\\']');
          console.log('Structured Data encontrados:', scripts.length);
          scripts.forEach((s, i) => console.log('Script ' + (i+1) + ':', JSON.parse(s.textContent)));
          alert('Revisa la consola para ver Structured Data');
        ">Ver Structured Data</button>
        
        <button class="gtm-button" onclick="
          window.open('https://tagassistant.google.com/', '_blank');
        ">Abrir Tag Assistant</button>
      </div>
      
      <div class="gtm-section">
        <h4>💡 Comandos de Consola</h4>
        <div class="gtm-code">
// Ver todo el Data Layer
dataLayer

// Ver eventos de producto
dataLayer.filter(e => e.productName)

// Ver último evento
dataLayer[dataLayer.length - 1]

// Verificar GTM
window.google_tag_manager
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Cerrar panel
  document.getElementById('gtm-validator-close').addEventListener('click', () => {
    panel.remove();
  });
  
  console.log('🔍 GTM Validator Panel abierto');
  console.log('📊 Data Layer actual:', window.dataLayer);
})();
