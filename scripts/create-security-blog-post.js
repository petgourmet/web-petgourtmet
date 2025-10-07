const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Contenido del artículo en Markdown
const blogContent = `# Protege las fotos de tu mascota: Guía de seguridad en redes sociales

¿Sabías que las cuentas de redes sociales donde compartes las adorables fotos de tu mascota pueden ser vulnerables a ataques cibernéticos? Como dueños de mascotas, solemos compartir momentos especiales de nuestros peludos compañeros en Instagram, WhatsApp y TikTok, pero es importante proteger estas cuentas que contienen información personal valiosa.

## ¿Por qué es importante proteger tus cuentas?

Cuando compartes fotos de tu mascota, también estás compartiendo información sobre tu rutina diaria, tu ubicación, tu hogar y tu familia. Los ciberdelincuentes pueden usar esta información para:

- Acceder a datos personales sensibles
- Realizar estafas o suplantación de identidad
- Obtener información sobre tus horarios y ubicación
- Acceder a otras cuentas vinculadas

## La verificación en dos pasos: tu mejor aliado

La **verificación en dos pasos** (