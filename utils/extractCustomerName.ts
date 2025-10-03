// Utilidad para extraer nombre del cliente de los datos de MercadoPago

export default function extractCustomerName(paymentData: any): string | null {
  // Intentar extraer nombre de diferentes ubicaciones en los datos de MP
  if (paymentData?.payer?.first_name && paymentData?.payer?.last_name) {
    return `${paymentData.payer.first_name} ${paymentData.payer.last_name}`;
  }
  
  if (paymentData?.payer?.first_name) {
    return paymentData.payer.first_name;
  }
  
  if (paymentData?.additional_info?.payer?.first_name && paymentData?.additional_info?.payer?.last_name) {
    return `${paymentData.additional_info.payer.first_name} ${paymentData.additional_info.payer.last_name}`;
  }
  
  if (paymentData?.metadata?.customer_name) {
    return paymentData.metadata.customer_name;
  }
  
  return null;
}