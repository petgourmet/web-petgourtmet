export interface ParsedShippingAddress {
  name?: string
  address?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  colonia?: string
  references?: string
}

function normalizeField(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function parseShippingAddress(raw: unknown): ParsedShippingAddress | null {
  if (!raw) return null

  try {
    let data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || typeof data !== 'object') return null

    const record = data as Record<string, unknown>
    if (record.shipping && typeof record.shipping === 'object') {
      data = record.shipping
    }

    const d = data as Record<string, unknown>
    const address = normalizeField(d, 'address', 'line1', 'street', 'street_name')
    const address2 = normalizeField(d, 'address2', 'line2', 'street_number', 'number')
    const city = normalizeField(d, 'city')
    const state = normalizeField(d, 'state')
    const postalCode = normalizeField(d, 'postalCode', 'postal_code', 'zip', 'zip_code', 'zipCode')
    const country = normalizeField(d, 'country') || 'MX'
    const name = normalizeField(d, 'name')
    const phone = normalizeField(d, 'phone')
    const colonia = normalizeField(d, 'colonia', 'neighborhood')
    const references = normalizeField(d, 'references', 'reference')

    if (!address && !address2 && !city && !state && !postalCode) return null

    return { name, address, address2, city, state, postalCode, country, phone, colonia, references }
  } catch {
    return null
  }
}

export function formatShippingAddressText(raw: unknown): string {
  const parsed = parseShippingAddress(raw)
  if (!parsed) return 'No disponible'

  const parts: string[] = []
  if (parsed.name) parts.push(parsed.name)
  if (parsed.address) parts.push(parsed.address)
  if (parsed.address2) parts.push(parsed.address2)
  if (parsed.colonia) parts.push(`Col. ${parsed.colonia}`)
  if (parsed.city || parsed.state) {
    parts.push([parsed.city, parsed.state].filter(Boolean).join(', '))
  }
  if (parsed.postalCode) parts.push(`CP: ${parsed.postalCode}`)
  if (parsed.country) parts.push(parsed.country)

  return parts.length > 0 ? parts.join(', ') : 'No disponible'
}

export function buildShippingClipboardText(
  raw: unknown,
  customer?: { name?: string; email?: string; phone?: string }
): string {
  const parsed = parseShippingAddress(raw)
  const lines: string[] = []

  const name = customer?.name || parsed?.name
  const phone = customer?.phone || parsed?.phone
  const email = customer?.email

  if (name) lines.push(`Nombre: ${name}`)
  if (phone) lines.push(`Teléfono: ${phone}`)
  if (email) lines.push(`Email: ${email}`)

  if (parsed) {
    if (lines.length > 0) lines.push('')
    lines.push('Dirección de envío:')
    if (parsed.address) lines.push(parsed.address)
    if (parsed.address2) lines.push(parsed.address2)
    if (parsed.colonia) lines.push(`Col. ${parsed.colonia}`)
    if (parsed.city || parsed.state) {
      lines.push([parsed.city, parsed.state].filter(Boolean).join(', '))
    }
    if (parsed.postalCode) lines.push(`CP: ${parsed.postalCode}`)
    if (parsed.country) lines.push(parsed.country)
    if (parsed.references) lines.push(`Referencias: ${parsed.references}`)
  } else if (!lines.length) {
    return 'Sin dirección registrada'
  }

  return lines.join('\n')
}
