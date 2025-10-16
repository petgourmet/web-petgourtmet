import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NotificationService, NotificationData } from '@/lib/services/notification-service';
import { detailedLogger } from '@/lib/detailed-logger';

/**
 * POST /api/notifications/subscription
 * Enviar notificación relacionada con suscripciones
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      detailedLogger.warn('🚫 Acceso no autorizado a API de notificaciones', {
        authError: authError?.message,
        hasUser: !!user
      });
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      targetUserId,
      type,
      title,
      message,
      data,
      channels = ['toast'],
      priority = 'medium',
      scheduledFor
    } = body;

    // Validar datos requeridos
    if (!targetUserId || !type || !title || !message) {
      return NextResponse.json(
        { 
          error: 'Datos requeridos faltantes',
          required: ['targetUserId', 'type', 'title', 'message']
        },
        { status: 400 }
      );
    }

    // Verificar permisos: solo el usuario puede enviarse notificaciones a sí mismo
    // o usuarios admin pueden enviar a cualquiera
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userRole?.role === 'admin';
    const isSelfNotification = user.id === targetUserId;

    if (!isAdmin && !isSelfNotification) {
      detailedLogger.warn('🚫 Usuario sin permisos intentó enviar notificación', {
        userId: user.id,
        targetUserId,
        isAdmin,
        isSelfNotification
      });
      
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    detailedLogger.info('📧 Enviando notificación de suscripción', {
      senderId: user.id,
      targetUserId,
      type,
      channels,
      priority,
      isAdmin,
      isSelfNotification
    });

    // Crear notificación
    const notification: NotificationData = {
      userId: targetUserId,
      type: type as NotificationData['type'],
      title,
      message,
      data,
      channels: channels as NotificationData['channels'],
      priority: priority as NotificationData['priority'],
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
    };

    // Enviar notificación usando el servicio
    const notificationService = NotificationService.getInstance();
    const result = await notificationService.sendNotification(notification);

    const processingTime = Date.now() - startTime;

    if (result.success) {
      detailedLogger.info('✅ Notificación enviada exitosamente', {
        senderId: user.id,
        targetUserId,
        type,
        processingTime: `${processingTime}ms`,
        results: result.results
      });

      return NextResponse.json({
        success: true,
        message: 'Notificación enviada exitosamente',
        data: {
          results: result.results,
          processingTime: `${processingTime}ms`
        }
      });
    } else {
      detailedLogger.warn('⚠️ Notificación enviada con errores', {
        senderId: user.id,
        targetUserId,
        type,
        processingTime: `${processingTime}ms`,
        errors: result.errors
      });

      return NextResponse.json({
        success: false,
        message: 'Notificación enviada con errores',
        data: {
          results: result.results,
          errors: result.errors,
          processingTime: `${processingTime}ms`
        }
      }, { status: 207 }); // 207 Multi-Status
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    detailedLogger.error('❌ Error enviando notificación', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo enviar la notificación'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/subscription
 * Obtener notificaciones del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'toast', 'all'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    detailedLogger.info('📋 Obteniendo notificaciones de usuario', {
      userId: user.id,
      type,
      limit,
      offset
    });

    if (type === 'toast') {
      // Obtener solo notificaciones toast pendientes
      const notificationService = NotificationService.getInstance();
      const toasts = await notificationService.getPendingToasts(user.id);

      return NextResponse.json({
        success: true,
        data: toasts,
        meta: {
          count: toasts.length,
          type: 'toast'
        }
      });
    } else {
      // Obtener todas las notificaciones del usuario
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      const { data: notifications, error, count } = await query;

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: notifications || [],
        meta: {
          count: notifications?.length || 0,
          total: count,
          limit,
          offset,
          type: type || 'all'
        }
      });
    }

  } catch (error) {
    detailedLogger.error('❌ Error obteniendo notificaciones', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las notificaciones'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/subscription
 * Marcar notificaciones como leídas
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationIds, action = 'mark_read' } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'IDs de notificaciones requeridos' },
        { status: 400 }
      );
    }

    detailedLogger.info('📝 Actualizando estado de notificaciones', {
      userId: user.id,
      notificationIds,
      action
    });

    let updateData: any = {};

    switch (action) {
      case 'mark_read':
        updateData = {
          read_at: new Date().toISOString(),
          status: 'read'
        };
        break;
      case 'mark_unread':
        updateData = {
          read_at: null,
          status: 'sent'
        };
        break;
      case 'archive':
        updateData = {
          archived_at: new Date().toISOString(),
          status: 'archived'
        };
        break;
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('user_id', user.id)
      .in('id', notificationIds)
      .select();

    if (error) throw error;

    detailedLogger.info('✅ Notificaciones actualizadas exitosamente', {
      userId: user.id,
      updatedCount: data?.length || 0,
      action
    });

    return NextResponse.json({
      success: true,
      message: `Notificaciones ${action === 'mark_read' ? 'marcadas como leídas' : action === 'mark_unread' ? 'marcadas como no leídas' : 'archivadas'} exitosamente`,
      data: {
        updatedCount: data?.length || 0,
        updatedIds: data?.map(n => n.id) || []
      }
    });

  } catch (error) {
    detailedLogger.error('❌ Error actualizando notificaciones', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron actualizar las notificaciones'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscription
 * Eliminar notificaciones
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationIds = searchParams.get('ids')?.split(',') || [];
    const deleteAll = searchParams.get('all') === 'true';

    if (!deleteAll && notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs de notificaciones requeridos o parámetro "all"' },
        { status: 400 }
      );
    }

    detailedLogger.info('🗑️ Eliminando notificaciones', {
      userId: user.id,
      notificationIds,
      deleteAll
    });

    let query = supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (!deleteAll) {
      query = query.in('id', notificationIds);
    }

    const { data, error } = await query.select();

    if (error) throw error;

    detailedLogger.info('✅ Notificaciones eliminadas exitosamente', {
      userId: user.id,
      deletedCount: data?.length || 0,
      deleteAll
    });

    return NextResponse.json({
      success: true,
      message: `${data?.length || 0} notificaciones eliminadas exitosamente`,
      data: {
        deletedCount: data?.length || 0,
        deletedIds: data?.map(n => n.id) || []
      }
    });

  } catch (error) {
    detailedLogger.error('❌ Error eliminando notificaciones', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron eliminar las notificaciones'
      },
      { status: 500 }
    );
  }
}