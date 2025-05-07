import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: "Se requiere ID de usuario y rol" }, { status: 400 })
    }

    // Verificar si el perfil existe
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileError) {
      // Si el perfil no existe, lo creamos
      const { error: insertError } = await supabase.from("profiles").insert([{ id: userId, role: role, email: "" }])

      if (insertError) {
        console.error("Error al crear perfil:", insertError)
        return NextResponse.json({ error: "Error al crear perfil de usuario" }, { status: 500 })
      }
    } else {
      // Si el perfil existe, actualizamos el rol
      const { error: updateError } = await supabase.from("profiles").update({ role: role }).eq("id", userId)

      if (updateError) {
        console.error("Error al actualizar rol:", updateError)
        return NextResponse.json({ error: "Error al actualizar rol de usuario" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al procesar la solicitud:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
