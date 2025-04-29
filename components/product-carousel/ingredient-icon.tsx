interface IngredientIconProps {
  icon: string
  name: string
}

export function IngredientIcon({ icon, name }: IngredientIconProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-1">
        <img src={icon || "/placeholder.svg"} alt={name} className="w-8 h-8" />
      </div>
      <span className="text-xs text-white">{name}</span>
    </div>
  )
}
