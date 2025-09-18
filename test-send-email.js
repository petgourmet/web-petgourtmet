async function testSendEmail() {
  console.log('📧 Probando envío de email de confirmación...')
  
  try {
    const response = await fetch('http://localhost:3001/api/subscriptions/send-thank-you-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'test-user-id',
        subscription_id: 13,
        user_email: 'fabian.gutierrez@petgourmet.mx',
        user_name: 'Fabian Gutierrez',
        subscription_details: {
          product_name: 'Plan de Pollo Semanal',
          frequency_text: 'Semanal',
          discounted_price: '100.00',
          next_billing_date: '2025-01-02'
        }
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Email enviado exitosamente:', result)
    } else {
      console.error('❌ Error enviando email:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testSendEmail()