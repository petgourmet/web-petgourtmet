import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== VERIFICACIÓN CLOUDINARY ===")

    // Verificar variables de entorno
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    console.log("Variables encontradas:", {
      cloudName,
      apiKey,
      apiSecret: apiSecret ? "***" + apiSecret.slice(-4) : "NO ENCONTRADO",
    })

    const verification = {
      cloudName: {
        value: cloudName,
        exists: !!cloudName,
        length: cloudName?.length || 0,
      },
      apiKey: {
        value: apiKey,
        exists: !!apiKey,
        length: apiKey?.length || 0,
      },
      apiSecret: {
        value: apiSecret ? "***" + apiSecret.slice(-4) : "NO ENCONTRADO",
        exists: !!apiSecret,
        length: apiSecret?.length || 0,
      },
    }

    // Probar conectividad con Cloudinary
    let connectivityTest = null
    if (cloudName) {
      try {
        console.log(`Probando conectividad con cloud: ${cloudName}`)
        const testResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: new FormData(), // FormData vacío para probar conectividad
        })

        const testText = await testResponse.text()
        console.log("Respuesta de conectividad:", testText)

        connectivityTest = {
          status: testResponse.status,
          response: testText,
          cloudExists: !testText.includes("Invalid cloud_name"),
        }
      } catch (error: any) {
        connectivityTest = {
          error: error.message,
          cloudExists: false,
        }
      }
    }

    return NextResponse.json({
      verification,
      connectivityTest,
      recommendations: generateRecommendations(verification, connectivityTest),
    })
  } catch (error: any) {
    console.error("Error en verificación:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateRecommendations(verification: any, connectivityTest: any) {
  const recommendations = []

  if (!verification.cloudName.exists) {
    recommendations.push("❌ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME no está configurado")
  } else if (connectivityTest && !connectivityTest.cloudExists) {
    recommendations.push(`❌ El cloud name "${verification.cloudName.value}" no existe en Cloudinary`)
    recommendations.push("🔍 Verifica tu cloud name en: https://cloudinary.com/console")
  } else {
    recommendations.push("✅ Cloud name configurado correctamente")
  }

  if (!verification.apiKey.exists) {
    recommendations.push("❌ NEXT_PUBLIC_CLOUDINARY_API_KEY no está configurado")
  } else if (verification.apiKey.length < 10) {
    recommendations.push("⚠️ API Key parece muy corto, verifica que sea correcto")
  } else {
    recommendations.push("✅ API Key configurado")
  }

  if (!verification.apiSecret.exists) {
    recommendations.push("❌ CLOUDINARY_API_SECRET no está configurado")
  } else if (verification.apiSecret.length < 10) {
    recommendations.push("⚠️ API Secret parece muy corto, verifica que sea correcto")
  } else {
    recommendations.push("✅ API Secret configurado")
  }

  return recommendations
}
