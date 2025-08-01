/**
 * Utilidad para manejar errores de autenticación de manera consistente
 * Proporciona mensajes de error específicos y amigables para el usuario
 */

export interface AuthError {
  title: string
  message: string
}

/**
 * Procesa errores de autenticación y devuelve mensajes específicos
 * @param error - El error capturado durante la autenticación
 * @param context - Contexto adicional (login, register, admin, etc.)
 * @returns Objeto con título y mensaje de error específicos
 */
export function handleAuthError(error: any, context: 'login' | 'register' | 'admin' | 'reset' | 'recovery' = 'login'): AuthError {
  const errorMessage = error?.message || error?.toString() || ''
  
  // Errores de credenciales
  if (errorMessage.includes('Invalid login credentials')) {
    return {
      title: 'Credenciales incorrectas',
      message: context === 'admin' 
        ? 'El correo electrónico o la contraseña son incorrectos. Verifica tus datos de administrador.'
        : 'El correo electrónico o la contraseña son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.'
    }
  }
  
  // Errores de confirmación de email
  if (errorMessage.includes('Email not confirmed')) {
    return {
      title: 'Correo no confirmado',
      message: context === 'admin'
        ? 'Tu cuenta de administrador aún no ha sido verificada. Revisa tu correo electrónico.'
        : 'Tu cuenta aún no ha sido verificada. Por favor, revisa tu correo electrónico y haz clic en el enlace de confirmación.'
    }
  }
  
  // Errores de usuario ya registrado
  if (errorMessage.includes('already registered')) {
    return {
      title: 'Correo ya registrado',
      message: 'Este correo electrónico ya está registrado. Si ya tienes una cuenta, intenta iniciar sesión.'
    }
  }
  
  // Errores de contraseña
  if (errorMessage.includes('Password should be at least')) {
    return {
      title: 'Contraseña muy corta',
      message: 'La contraseña debe tener al menos 6 caracteres. Por favor, elige una contraseña más segura.'
    }
  }
  
  if (errorMessage.includes('New password should be different')) {
    return {
      title: 'Contraseña repetida',
      message: 'La nueva contraseña debe ser diferente a la anterior. Por favor, elige una contraseña distinta.'
    }
  }
  
  if (errorMessage.includes('Password is too weak')) {
    return {
      title: 'Contraseña débil',
      message: 'La contraseña es muy débil. Incluye mayúsculas, minúsculas, números y símbolos.'
    }
  }
  
  // Errores de email
  if (errorMessage.includes('Unable to validate email address')) {
    return {
      title: 'Correo inválido',
      message: 'El formato del correo electrónico no es válido. Por favor, verifica que esté escrito correctamente.'
    }
  }
  
  // Errores de límites de velocidad
  if (errorMessage.includes('Email rate limit exceeded')) {
    return {
      title: 'Demasiados intentos',
      message: 'Has excedido el límite de intentos. Por favor, espera unos minutos antes de intentar de nuevo.'
    }
  }
  
  if (errorMessage.includes('Too many requests')) {
    return {
      title: 'Demasiadas solicitudes',
      message: 'Has realizado demasiados intentos. Por favor, espera 15 minutos antes de intentar de nuevo.'
    }
  }
  
  if (errorMessage.includes('For security purposes')) {
    return {
      title: 'Límite de seguridad',
      message: 'Por seguridad, solo puedes solicitar un enlace de recuperación cada 60 segundos.'
    }
  }
  
  // Errores de usuario no encontrado
  if (errorMessage.includes('User not found')) {
    return {
      title: 'Usuario no encontrado',
      message: context === 'admin'
        ? 'No existe una cuenta de administrador con este correo electrónico.'
        : context === 'recovery'
        ? 'No existe una cuenta con este correo electrónico. Verifica que esté escrito correctamente.'
        : 'No existe una cuenta con este correo electrónico. ¿Quieres crear una cuenta nueva?'
    }
  }
  
  // Errores de permisos
  if (errorMessage.includes('No tienes permisos de administrador')) {
    return {
      title: 'Acceso denegado',
      message: 'Tu cuenta no tiene permisos de administrador. Contacta al administrador del sistema.'
    }
  }
  
  // Errores de registro deshabilitado
  if (errorMessage.includes('Signup is disabled')) {
    return {
      title: 'Registro deshabilitado',
      message: 'El registro de nuevos usuarios está temporalmente deshabilitado. Inténtalo más tarde.'
    }
  }
  
  // Errores de sesión
  if (errorMessage.includes('Session not found') || errorMessage.includes('Invalid session')) {
    return {
      title: context === 'reset' ? 'Sesión expirada' : 'Sesión inválida',
      message: context === 'reset'
        ? 'Tu sesión ha expirado. Por favor, solicita un nuevo enlace de recuperación.'
        : 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.'
    }
  }
  
  // Errores de conexión
  if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
    return {
      title: 'Error de conexión',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.'
    }
  }
  
  // Error genérico
  return {
    title: 'Error',
    message: context === 'recovery'
      ? 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo.'
      : context === 'reset'
      ? 'No se pudo restablecer la contraseña. Inténtalo de nuevo.'
      : 'Ha ocurrido un error. Por favor, inténtalo de nuevo.'
  }
}

/**
 * Hook personalizado para manejar errores de autenticación con toast
 * @param toast - Función toast de shadcn/ui
 * @param context - Contexto de la autenticación
 */
export function useAuthErrorHandler(toast: any, context: 'login' | 'register' | 'admin' | 'reset' | 'recovery' = 'login') {
  return (error: any) => {
    console.error(`Error de autenticación (${context}):`, error)
    
    const { title, message } = handleAuthError(error, context)
    
    toast({
      title,
      description: message,
      variant: 'destructive',
    })
  }
}