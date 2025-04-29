"use client"

import type React from "react"

interface SelectionCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  labelClassName?: string
}

export default function SelectionCard({ selected, onClick, icon, label, labelClassName = "" }: SelectionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
        selected
          ? "border-teal-500 bg-teal-50 dark:border-red-600 dark:bg-red-50"
          : "border-gray-200 hover:border-teal-300 dark:border-gray-700 dark:hover:border-red-400"
      }`}
    >
      {icon}
      <span
        className={`mt-2 font-medium ${selected ? "text-teal-700 dark:text-red-700" : "text-gray-700"} ${labelClassName}`}
      >
        {label}
      </span>
      {selected && (
        <div className="absolute top-2 right-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-teal-500 dark:text-red-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
