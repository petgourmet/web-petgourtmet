"use client"
import { clsx } from "clsx"
import type { Benefit } from "@/types/nutrition"

interface BenefitCardProps {
  benefit: Benefit
  className?: string
}

const cardClasses = {
  container: "bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all",
  iconWrapper: "w-12 h-12 rounded-full bg-primary-brand/10 flex items-center justify-center mb-4",
  icon: "w-6 h-6 text-primary-brand",
  title: "text-xl font-bold mb-3",
  description: "text-gray-600",
}

export function BenefitCard({ benefit, className }: BenefitCardProps) {
  const IconComponent = benefit.icon

  return (
    <article className={clsx(cardClasses.container, className)}>
      <div className={cardClasses.iconWrapper}>
        <IconComponent className={cardClasses.icon} />
      </div>
      <h3 className={cardClasses.title}>{benefit.title}</h3>
      <p className={cardClasses.description}>{benefit.description}</p>
    </article>
  )
}
