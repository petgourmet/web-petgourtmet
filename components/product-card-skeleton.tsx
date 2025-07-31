"use client"

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden shadow-xl h-full flex flex-col bg-white animate-pulse">
      {/* Imagen skeleton */}
      <div className="h-48 bg-gray-200 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
      </div>
      
      {/* Contenido skeleton */}
      <div className="p-4 flex-1 space-y-3">
        {/* Título */}
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        
        {/* Descripción */}
        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
        </div>
        
        {/* Features */}
        <div className="flex gap-1 flex-wrap">
          <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-14 animate-pulse"></div>
        </div>
        
        {/* Precio */}
        <div className="mt-auto pt-2">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

// Componente para múltiples skeletons
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}