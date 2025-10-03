// Utilidad para extraer email del cliente de los datos de MercadoPago

export default function extractCustomerEmail(paymentData: any): string | null {
  // Intentar extraer email de diferentes ubicaciones en los datos de MP
  if (paymentData?.payer?.email) {
    return paymentData.payer.email;
  }
  
  if (paymentData?.additional_info?.payer?.email) {
    return paymentData.additional_info.payer.email;
  }
  
  if (paymentData?.metadata?.customer_email) {
    return paymentData.metadata.customer_email;
  }
  
  return null;
}