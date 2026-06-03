const debugLoggingEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true' ||
  process.env.ENABLE_DEBUG_LOGS === 'true'

const noop = () => {}

export function createProductionSafeConsole(): typeof globalThis.console {
  const baseConsole = globalThis.console

  if (debugLoggingEnabled) {
    return baseConsole
  }

  return new Proxy(baseConsole, {
    get(target, prop, receiver) {
      if (prop === 'log' || prop === 'info' || prop === 'debug' || prop === 'table') {
        return noop
      }

      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
