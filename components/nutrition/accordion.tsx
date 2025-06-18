"use client"
import { clsx } from "clsx"
import type { FAQ } from "@/types/nutrition"

interface AccordionProps {
  faqs: FAQ[]
  expandedIndex: number | null
  onToggle: (index: number) => void
  className?: string
}

const accordionClasses = {
  container: "space-y-4",
  item: "border border-gray-200 rounded-lg overflow-hidden",
  button: "w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center", // Modificado p-4 a px-4 py-3
  title: "font-semibold text-gray-900 pr-4",
  icon: "w-5 h-5 text-gray-500 transition-transform",
  iconExpanded: "rotate-180",
  content: "px-4 py-2 bg-white border-t border-gray-200",
  text: "text-gray-700 text-sm leading-relaxed",
  paragraph: "mb-1.5 last:mb-0",
}

export function Accordion({ faqs, expandedIndex, onToggle, className }: AccordionProps) {
  return (
    <div className={clsx(accordionClasses.container, className)}>
      {faqs.map((faq, index) => (
        <article key={index} className={accordionClasses.item}>
          <button
            onClick={() => onToggle(index)}
            className={accordionClasses.button}
            aria-expanded={expandedIndex === index}
            aria-controls={`faq-content-${index}`}
            id={`faq-button-${index}`}
          >
            <h4 className={accordionClasses.title}>{faq.question}</h4>
            <svg
              className={clsx(accordionClasses.icon, expandedIndex === index && accordionClasses.iconExpanded)}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedIndex === index && (
            <div
              className={accordionClasses.content}
              id={`faq-content-${index}`}
              aria-labelledby={`faq-button-${index}`}
            >
              <div className={accordionClasses.text}>
                {faq.answer.split("\n").map((paragraph, i) => (
                  <p key={i} className={accordionClasses.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
