import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server" // Usar cliente de servidor para auth
import { supabaseAdmin } from "@/lib/supabase/client" // Usar cliente admin para operaciones de BD

export async function POST(request: Request) {
    try {
        // 1. Verificar autenticación y rol de administrador
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "No autorizado. Debes iniciar sesión." }, { status: 401 })
        }

        // Verificar rol en la tabla profiles
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (!profile || profile.role !== "admin") {
            return NextResponse.json({ error: "No autorizado. Se requieren permisos de administrador." }, { status: 403 })
        }

        if (!supabaseAdmin) {
            console.error("SUPABASE_SERVICE_ROLE_KEY no está configurado")
            return NextResponse.json(
                { error: "Error de configuración del servidor. Contáctese con soporte." },
                { status: 500 }
            )
        }

        // 2. Obtener datos del cuerpo de la petición
        const body = await request.json()
        const { id, ...blogData } = body

        // Sanitizar category_id para evitar error de FK (0 no existe)
        if (blogData.category_id === 0 || blogData.category_id === "0") {
            blogData.category_id = null;
        }

        // Validar datos mínimos
        if (!blogData.title || !blogData.slug) {
            return NextResponse.json({ error: "El título y el slug son obligatorios" }, { status: 400 })
        }

        // Asegurar que el author_id sea el usuario actual si no está presente (aunque debería venir del front)
        if (!blogData.author_id) {
            blogData.author_id = user.id
        }

        let result

        // 3. Realizar operación en la base de datos (Crear o Actualizar)
        if (id) {
            // Actualizar existente
            console.log(`Actualizando blog ${id}...`)
            result = await supabaseAdmin
                .from("blogs")
                .update({
                    ...blogData,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select()
                .single()
        } else {
            // Crear nuevo
            console.log("Creando nuevo blog...")
            result = await supabaseAdmin
                .from("blogs")
                .insert([
                    {
                        ...blogData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }
                ])
                .select()
                .single()
        }

        if (result.error) {
            console.error("Error en operación de BD:", result.error)
            return NextResponse.json({ error: result.error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: result.data,
            message: id ? "Blog actualizado correctamente" : "Blog creado correctamente",
        })
    } catch (error: any) {
        console.error("Error inesperado en api/admin/blogs:", error)
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        )
    }
}
