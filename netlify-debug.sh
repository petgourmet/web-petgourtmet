#!/bin/bash
# Script de diagnóstico para Netlify

echo "🔍 Verificando estructura de build de Next.js..."
echo ""

if [ -d ".next" ]; then
  echo "✅ Directorio .next existe"
  echo "📦 Contenido de .next:"
  ls -lh .next/
  echo ""
  
  if [ -d ".next/static" ]; then
    echo "✅ .next/static existe"
    echo "📦 Tamaño de .next/static:"
    du -sh .next/static/
    echo ""
    
    if [ -d ".next/static/chunks" ]; then
      echo "✅ .next/static/chunks existe"
      echo "📦 Contenido de .next/static/chunks:"
      ls -lh .next/static/chunks/ | head -20
      echo ""
      
      if [ -d ".next/static/chunks/app" ]; then
        echo "✅ .next/static/chunks/app existe"
        echo "📦 Contenido de .next/static/chunks/app:"
        ls -lh .next/static/chunks/app/
        echo ""
      else
        echo "❌ .next/static/chunks/app NO existe"
      fi
    else
      echo "❌ .next/static/chunks NO existe"
    fi
  else
    echo "❌ .next/static NO existe"
  fi
  
  if [ -d ".next/server" ]; then
    echo "✅ .next/server existe"
    echo "📦 Tamaño de .next/server:"
    du -sh .next/server/
  else
    echo "❌ .next/server NO existe"
  fi
else
  echo "❌ Directorio .next NO existe"
fi

echo ""
echo "🔍 Verificando package.json..."
if [ -f "package.json" ]; then
  echo "✅ package.json existe"
  echo "📦 Next.js version:"
  grep '"next"' package.json
fi

echo ""
echo "🔍 Verificando node version..."
node --version

echo ""
echo "🔍 Verificando pnpm version..."
pnpm --version
