import { NextRequest, NextResponse } from 'next/server'
import { getClientIP, checkRateLimit } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'

export async function POST(request: NextRequest) {
  try {
    const { 
      testType, 
      honeypot, 
      recaptchaToken, 
      content,
      email 
    } = await request.json()

    const clientIp = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    const results = {
      testType,
      timestamp: new Date().toISOString(),
      ip: clientIp,
      results: {} as any
    }

    // Test 1: Honeypot Validation
    if (testType === 'honeypot' || testType === 'all') {
      const honeypotTriggered = honeypot && honeypot.trim() !== ''
      
      results.results.honeypot = {
        passed: !honeypotTriggered,
        honeypotValue: honeypot,
        message: honeypotTriggered 
          ? 'Honeypot detectó bot - BLOQUEADO' 
          : 'Honeypot pasó - Usuario legítimo'
      }

      if (honeypotTriggered) {
        logSecurityEvent({
          ip: clientIp,
          userAgent,
          endpoint: '/api/test-security',
          action: 'honeypot_test',
          severity: 'high',
          details: { honeypot, testType: 'honeypot_test' },
          blocked: true,
          rateLimitExceeded: false
        })
      }
    }

    // Test 2: Rate Limiting
    if (testType === 'rate_limit' || testType === 'all') {
      // Usar la función de rate limiting del middleware
      const rateLimitResult = checkRateLimit(clientIp, 'security_test')
      
      results.results.rateLimit = {
        passed: rateLimitResult.allowed,
        attempts: rateLimitResult.remaining ? (10 - rateLimitResult.remaining) : 1,
        resetTime: rateLimitResult.resetTime,
        message: rateLimitResult.allowed 
          ? `Rate limit OK - ${rateLimitResult.remaining} intentos restantes` 
          : `Rate limit EXCEDIDO - Bloqueado hasta ${new Date(rateLimitResult.resetTime).toLocaleTimeString()}`
      }

      if (!rateLimitResult.allowed) {
        logSecurityEvent({
          ip: clientIp,
          userAgent,
          endpoint: '/api/test-security',
          action: 'rate_limit_test',
          severity: 'medium',
          details: { 
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            testType: 'rate_limit_test'
          },
          blocked: true,
          rateLimitExceeded: true
        })
      }
    }

    // Test 3: Content Spam Detection
    if (testType === 'content_filter' || testType === 'all') {
      const testContent = content || 'Contenido de prueba normal'
      
      // Patrones de spam para testing
      const spamPatterns = [
        /\b(viagra|cialis|casino|poker|lottery|winner)\b/i,
        /\b(click here|free money|make money)\b/i,
        /https?:\/\/[^\s]+/g,
        /(.)\1{10,}/,
        /[A-Z]{20,}/
      ]

      let isSpam = false
      let detectedPatterns = []

      for (const pattern of spamPatterns) {
        if (pattern.test(testContent)) {
          isSpam = true
          detectedPatterns.push(pattern.toString())
        }
      }

      results.results.contentFilter = {
        passed: !isSpam,
        content: testContent,
        detectedPatterns,
        message: isSpam 
          ? `Contenido SPAM detectado - ${detectedPatterns.length} patrones` 
          : 'Contenido limpio - Sin spam detectado'
      }

      if (isSpam) {
        logSecurityEvent({
          ip: clientIp,
          userAgent,
          endpoint: '/api/test-security',
          action: 'content_filter_test',
          severity: 'medium',
          details: { 
            content: testContent,
            detectedPatterns,
            testType: 'content_filter_test'
          },
          blocked: true,
          rateLimitExceeded: false
        })
      }
    }

    // Test 4: reCAPTCHA Verification
    if (testType === 'recaptcha' || testType === 'all') {
      if (!recaptchaToken) {
        results.results.recaptcha = {
          passed: false,
          message: 'Token de reCAPTCHA no proporcionado',
          score: 0
        }
      } else {
        try {
          // Simular verificación de reCAPTCHA para pruebas
          // En un entorno real, esto se haría con Google reCAPTCHA API
          const isValidToken = recaptchaToken && recaptchaToken.length > 10
          const mockScore = isValidToken ? 0.8 : 0.1
          
          results.results.recaptcha = {
            passed: isValidToken && mockScore >= 0.5,
            score: mockScore,
            success: isValidToken,
            action: 'security_test',
            message: isValidToken 
              ? `reCAPTCHA válido - Score: ${(mockScore * 100).toFixed(0)}% (simulado)`
              : `reCAPTCHA falló - Token inválido (simulado)`
          }

          logSecurityEvent({
            ip: clientIp,
            userAgent,
            endpoint: '/api/test-security',
            action: 'recaptcha_test',
            severity: isValidToken ? 'low' : 'medium',
            details: { 
              score: mockScore,
              success: isValidToken,
              testType: 'recaptcha_test',
              simulated: true
            },
            blocked: !isValidToken,
            rateLimitExceeded: false,
            recaptchaScore: mockScore
          })
        } catch (error) {
          results.results.recaptcha = {
            passed: false,
            message: `Error verificando reCAPTCHA: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            score: 0
          }
        }
      }
    }

    // Test 5: Email Validation
    if (testType === 'email_validation' || testType === 'all') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const isValidEmail = email && emailRegex.test(email)
      
      // Detectar emails sospechosos
      const suspiciousPatterns = [
        /temp|temporary|disposable|fake|test/i,
        /10minutemail|guerrillamail|mailinator/i,
        /^\w+@\w+\.\w{2}$/  // Emails muy simples
      ]

      const isSuspicious = suspiciousPatterns.some(pattern => 
        email && pattern.test(email)
      )

      results.results.emailValidation = {
        passed: isValidEmail && !isSuspicious,
        email: email,
        isValid: isValidEmail,
        isSuspicious: isSuspicious,
        message: !email 
          ? 'Email no proporcionado'
          : !isValidEmail 
            ? 'Formato de email inválido'
            : isSuspicious 
              ? 'Email sospechoso detectado'
              : 'Email válido'
      }
    }

    // Calcular resultado general
    const allTests = Object.values(results.results)
    const passedTests = allTests.filter((test: any) => test.passed).length
    const totalTests = allTests.length

    results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      overallPassed: passedTests === totalTests,
      successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error en test de seguridad:', error)
    
    await logSecurityEvent({
      type: 'system_error',
      action: 'security_test',
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        testType: 'error'
      }
    })

    return NextResponse.json(
      { 
        error: 'Error interno en test de seguridad',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de pruebas de seguridad anti-spam',
    availableTests: [
      'honeypot',
      'rate_limit', 
      'content_filter',
      'recaptcha',
      'email_validation',
      'all'
    ],
    usage: {
      method: 'POST',
      body: {
        testType: 'all | honeypot | rate_limit | content_filter | recaptcha | email_validation',
        honeypot: 'string (opcional)',
        recaptchaToken: 'string (opcional)',
        content: 'string (opcional)',
        email: 'string (opcional)'
      }
    }
  })
}