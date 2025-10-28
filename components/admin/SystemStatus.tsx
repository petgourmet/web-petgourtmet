'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Database, 
  CreditCard, 
  Mail, 
  Image, 
  Webhook,
  Activity,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'unhealthy':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'unhealthy':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const getServiceIcon = (service: string) => {
  switch (service) {
    case 'database':
      return <Database className="h-4 w-4" />;
    case 'stripe':
      return <CreditCard className="h-4 w-4" />;
    case 'stripe_webhook':
      return <Webhook className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'cloudinary':
      return <Image className="h-4 w-4" />;
    default:
      return <Server className="h-4 w-4" />;
  }
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const formatResponseTime = (ms?: number): string => {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export default function SystemStatus() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health');
      const data: HealthResponse = await response.json();
      
      setHealthData(data);
      setLastUpdated(new Date());
      
      if (data.status === 'unhealthy') {
        toast.error('Algunos servicios del sistema están experimentando problemas');
      } else if (data.status === 'degraded') {
        toast.warning('Algunos servicios del sistema están funcionando con limitaciones');
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Error al obtener el estado del sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    fetchHealthData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      toast.success('Auto-actualización activada');
    } else {
      toast.info('Auto-actualización desactivada');
    }
  };

  if (loading && !healthData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
          <CardDescription>
            Cargando información del estado del sistema...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Estado del Sistema
                {healthData && (
                  <Badge 
                    variant={healthData.status === 'healthy' ? 'default' : 
                            healthData.status === 'degraded' ? 'secondary' : 'destructive'}
                    className="ml-2"
                  >
                    {healthData.status === 'healthy' ? 'Saludable' :
                     healthData.status === 'degraded' ? 'Degradado' : 'Crítico'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de todos los servicios del sistema
                {lastUpdated && (
                  <span className="block text-xs mt-1">
                    Última actualización: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
                className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {healthData && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {healthData.summary.healthy}
                </div>
                <div className="text-sm text-muted-foreground">Saludables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {healthData.summary.degraded}
                </div>
                <div className="text-sm text-muted-foreground">Degradados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {healthData.summary.unhealthy}
                </div>
                <div className="text-sm text-muted-foreground">Críticos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatUptime(healthData.uptime)}
                </div>
                <div className="text-sm text-muted-foreground">Tiempo activo</div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progreso general del sistema</span>
              <span>{Math.round((healthData.summary.healthy / healthData.summary.total) * 100)}%</span>
            </div>
            <Progress 
              value={(healthData.summary.healthy / healthData.summary.total) * 100} 
              className="mt-2"
            />
          </CardContent>
        )}
      </Card>

      {/* Lista de servicios */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthData.checks.map((check, index) => (
            <Card key={index} className="relative">
              <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${getStatusColor(check.status)}`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(check.service)}
                    <CardTitle className="text-base capitalize">
                      {check.service.replace('_', ' ')}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <Badge 
                      variant={check.status === 'healthy' ? 'default' : 
                              check.status === 'degraded' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {check.status === 'healthy' ? 'OK' :
                       check.status === 'degraded' ? 'WARN' : 'ERROR'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {check.responseTime && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tiempo de respuesta:</span>
                      <span className={check.responseTime > 1000 ? 'text-yellow-600' : 'text-green-600'}>
                        {formatResponseTime(check.responseTime)}
                      </span>
                    </div>
                  )}
                  
                  {check.error && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Error:</span>
                      <div className="text-red-600 text-xs mt-1 p-2 bg-red-50 rounded border">
                        {check.error}
                      </div>
                    </div>
                  )}
                  
                  {check.details && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Detalles:</span>
                      <div className="text-xs mt-1 p-2 bg-gray-50 rounded border">
                        {Object.entries(check.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-mono">
                              {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Información adicional */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Versión:</span>
                <div className="font-mono">{healthData.version}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Última verificación:</span>
                <div className="font-mono">{new Date(healthData.timestamp).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Servicios monitoreados:</span>
                <div className="font-mono">{healthData.summary.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}