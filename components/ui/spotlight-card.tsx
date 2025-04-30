"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string
  as?: React.ElementType
}

export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ className, children, spotlightColor = "rgba(120, 119, 198, 0.1)", as: Component = "div", ...props }, ref) => {
    const cardRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
    const [opacity, setOpacity] = React.useState<number>(0)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setPosition({ x, y })
        setOpacity(1)
      }
    }

    const handleMouseLeave = () => {
      setOpacity(0)
    }

    return (
      <Component
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className={cn(
          "relative overflow-hidden rounded-xl border bg-white dark:bg-[#e7ae84] transition-all duration-300",
          className,
        )}
        style={{
          boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(0, 0, 0, 0.07)",
        }}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
          style={{
            opacity,
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
          }}
        />
        {children}
      </Component>
    )
  },
)

SpotlightCard.displayName = "SpotlightCard"
