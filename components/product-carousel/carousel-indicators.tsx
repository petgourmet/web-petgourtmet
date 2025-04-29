"use client"

interface CarouselIndicatorsProps {
  count: number
  activeIndex: number
  onSelect: (index: number) => void
}

export function CarouselIndicators({ count, activeIndex, onSelect }: CarouselIndicatorsProps) {
  return (
    <div className="flex space-x-2">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`w-3 h-3 rounded-full transition-all ${
            activeIndex === index ? "bg-white scale-110" : "bg-white/50 hover:bg-white/70"
          }`}
          aria-label={`Ir a slide ${index + 1}`}
        />
      ))}
    </div>
  )
}
