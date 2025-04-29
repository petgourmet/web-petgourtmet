"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface NutritionChartProps {
  data: {
    protein: number
    moisture: number
    fat: number
    ash: number
    fiber: number
  }
}

export function NutritionChart({ data }: NutritionChartProps) {
  // Convertir los datos a formato para el gráfico
  const chartData = [
    { name: "Proteína", value: data.protein, color: "#1F2937" },
    { name: "Humedad", value: data.moisture, color: "#E5E7EB" },
    { name: "Grasa", value: data.fat, color: "#FEF3C7" },
    { name: "Ceniza", value: data.ash, color: "#9CA3AF" },
    { name: "Fibra", value: data.fiber, color: "#92400E" },
  ]

  return (
    <div className="w-full h-[300px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Plato de comida en el centro */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] bg-white rounded-full flex items-center justify-center">
        <div className="w-[80px] h-[80px] bg-white rounded-full shadow-inner flex items-center justify-center">
          <div className="w-[60px] h-[60px] bg-amber-300 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">Pet's Table</span>
          </div>
        </div>
      </div>
    </div>
  )
}
