import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger, LogCategory } from '@/lib/logger';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = await createClient();
    
    // Verificar conexión básica
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }

    const responseTime = Date.now() - start;
    
    return {
      service: 'database',
      status: 'healthy',
      responseTime,
      details: {
        connection: 'active',
        query: 'successful'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkStripe(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Verificar conectividad con Stripe API usando endpoint básico
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      throw new Error(`Stripe API responded with status ${response.status}`);
    }

    const data = await response.json();

    return {
      service: 'stripe',
      status: 'healthy',
      responseTime,
      details: {
        api: 'accessible',
        authentication: 'valid',
        currency: data.available?.[0]?.currency || 'N/A'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'stripe',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown Stripe error'
    };
  }
}

async function checkEmailService(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Verificar configuración de email SMTP
    const emailConfig = {
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      emailFrom: process.env.EMAIL_FROM
    };

    const responseTime = Date.now() - start;

    if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPass) {
      return {
        service: 'email',
        status: 'degraded',
        responseTime,
        error: 'Email service not fully configured',
        details: {
          smtpHost: !!emailConfig.smtpHost,
          smtpUser: !!emailConfig.smtpUser,
          smtpPass: !!emailConfig.smtpPass,
          emailFrom: !!emailConfig.emailFrom
        }
      };
    }

    return {
      service: 'email',
      status: 'healthy',
      responseTime,
      details: {
        provider: 'smtp',
        host: emailConfig.smtpHost,
        configured: true
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'email',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown email service error'
    };
  }
}

async function checkCloudinary(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const cloudinaryConfig = {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    };

    const responseTime = Date.now() - start;

    if (!cloudinaryConfig.cloudName) {
      return {
        service: 'cloudinary',
        status: 'degraded',
        responseTime,
        error: 'Cloudinary not fully configured',
        details: {
          cloudName: !!cloudinaryConfig.cloudName,
          apiKey: !!cloudinaryConfig.apiKey,
          apiSecret: !!cloudinaryConfig.apiSecret
        }
      };
    }

    return {
      service: 'cloudinary',
      status: 'healthy',
      responseTime,
      details: {
        cloudName: cloudinaryConfig.cloudName,
        configured: true
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'cloudinary',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown Cloudinary error'
    };
  }
}

async function checkStripeWebhook(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/stripe/webhook`;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const responseTime = Date.now() - start;

    if (!webhookSecret) {
      return {
        service: 'stripe_webhook',
        status: 'degraded',
        responseTime,
        error: 'Stripe webhook secret not configured',
        details: {
          url: webhookUrl,
          secretConfigured: false
        }
      };
    }

    // Verificar que la URL es accesible (sin hacer request real para evitar errores de firma)
    return {
      service: 'stripe_webhook',
      status: 'healthy',
      responseTime,
      details: {
        url: webhookUrl,
        secretConfigured: true,
        endpoint: 'configured'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'stripe_webhook',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown webhook endpoint error'
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info(LogCategory.SYSTEM, 'Health check iniciado');

    // Ejecutar todas las verificaciones en paralelo
    const checks = await Promise.all([
      checkDatabase(),
      checkStripe(),
      checkEmailService(),
      checkCloudinary(),
      checkStripeWebhook()
    ]);

    // Calcular estadísticas
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length
    };

    // Determinar estado general
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
      summary
    };

    const totalTime = Date.now() - startTime;
    logger.info(LogCategory.SYSTEM, `Health check completado en ${totalTime}ms`, {
      status: overallStatus,
      summary
    });

    // Retornar código de estado HTTP apropiado
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error(LogCategory.SYSTEM, 'Error en health check', undefined, {
      error: error instanceof Error ? error.message : String(error),
      totalTime
    });

    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: [{
        service: 'health_check',
        status: 'unhealthy',
        responseTime: totalTime,
        error: error instanceof Error ? error.message : 'Unknown health check error'
      }],
      summary: {
        total: 1,
        healthy: 0,
        unhealthy: 1,
        degraded: 0
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Endpoint simple para verificaciones básicas de uptime
export async function HEAD(request: NextRequest) {
  try {
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}