'use client'

import { useEffect, useState } from 'react'

export default function TestSuscripcion() {
  const [currentUrl, setCurrentUrl] = useState('Cargando...')
  
  useEffect(() => {
    console.info('🚀 PÁGINA DE PRUEBA CARGADA');
    console.info('🔍 URL actual:', window.location.href);
    console.info('🔍 Parámetros URL:', window.location.search);
    
    setCurrentUrl(window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const externalReference = urlParams.get('external_reference');
    const collectionStatus = urlParams.get('collection_status');
    const collectionId = urlParams.get('collection_id');
    
    console.info('📋 Parámetros extraídos:', {
      externalReference,
      collectionStatus,
      collectionId,
      timestamp: new Date().toISOString()
    });
    
    if (collectionStatus === 'approved') {
      console.info('✅ SUSCRIPCIÓN APROBADA DETECTADA');
      console.info('🎯 External Reference:', externalReference);
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Página de Prueba - Suscripción</h1>
      <p className="mb-4">Esta página está diseñada para probar el procesamiento de suscripciones.</p>
      <p className="text-sm text-gray-600">Revisa la consola del navegador para ver los logs de debugging.</p>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">URL Actual:</h2>
        <p className="text-sm break-all">{currentUrl}</p>
      </div>
    </div>
  )
}