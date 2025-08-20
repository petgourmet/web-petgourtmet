import type { Metadata } from 'next'
import { generateMetadata } from './metadata'

interface Props {
  children: React.ReactNode
  params: { slug: string }
  searchParams: { id?: string }
}

export { generateMetadata }

export default function ProductLayout({ children }: Props) {
  return children
}