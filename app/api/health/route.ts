import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import logger, { LogCategory } from '@/lib/logger';

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

async function checkMercadoPago(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    // Verificar conectividad con MercadoPago API usando endpoint básico
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      throw new Error(`MercadoPago API responded with status ${response.status}`);
    }

    return {
      service: 'mercadopago',
      status: 'healthy',
      responseTime,
      details: {
        api: 'accessible',
        authentication: 'valid'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'mercadopago',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown MercadoPago error'
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

async function checkWebhookEndpoint(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`;

    // Hacer una petición GET al webhook (debería responder con método no permitido pero estar accesible)
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - start;

    // El webhook puede responder con 200 (MercadoPago challenge) o 405 (Method Not Allowed)
    if (response.status === 200 || response.status === 405) {
      return {
        service: 'webhook_endpoint',
        status: 'healthy',
        responseTime,
        details: {
          url: webhookUrl,
          accessible: true,
          status: response.status,
          expectedResponse: true
        }
      };
    }

    return {
      service: 'webhook_endpoint',
      status: 'degraded',
      responseTime,
      error: `Unexpected response status: ${response.status}`,
      details: {
        url: webhookUrl,
        status: response.status
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      service: 'webhook_endpoint',
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
      checkMercadoPago(),
      checkEmailService(),
      checkCloudinary(),
      checkWebhookEndpoint()
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
    logger.error(LogCategory.SYSTEM, 'Error en health check', error);

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