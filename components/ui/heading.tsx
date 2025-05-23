import type React from "react"
import { cn } from "@/lib/utils"
import type { JSX } from "react/jsx-runtime" // Import JSX to fix the undeclared variable error

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  variant?: "default" | "primary" | "secondary" | "muted"
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
}

export function Heading({ level = 2, children, className, variant = "default", size = "lg", ...props }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements

  const variantClasses = {
    default: "text-foreground",
    primary: "text-primary",
    secondary: "text-secondary-foreground",
    muted: "text-muted-foreground",
  }

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
  }

  return (
    <Tag
      className={cn("font-semibold tracking-tight", variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Tag>
  )
}

export default Heading
