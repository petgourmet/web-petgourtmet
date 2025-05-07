import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Crear cliente de Supabase con la service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function GET() {
  try {
    // Obtener cookies para la autenticación
    const cookieStore = cookies()

    // Crear cliente de Supabase con las cookies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      },
    )

    // Verificar la sesión del usuario
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error("Error de sesión o no hay sesión:", sessionError)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar si el usuario es administrador
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Error al obtener perfil:", profileError)
      return NextResponse.json({ error: "Error al verificar permisos" }, { status: 500 })
    }

    if (!profile || profile.role !== "admin") {
      console.log("Usuario no es admin:", session.user.email, "Rol:", profile?.role)
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Obtener usuarios usando el cliente admin
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error("Error al obtener usuarios:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Obtener perfiles
    const { data: profiles, error: profilesError } = await supabaseAdmin.from("profiles").select("*")

    if (profilesError) {
      console.error("Error al obtener perfiles:", profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Combinar datos
    const combinedUsers = authUsers.users.map((user) => {
      const profile = profiles?.find((p) => p.id === user.id)
      return {
        ...user,
        role: profile?.role || "user",
      }
    })

    return NextResponse.json({ users: combinedUsers })
  } catch (error: any) {
    console.error("Error en la API de usuarios:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
