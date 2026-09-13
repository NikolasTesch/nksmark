// ponytail: plain console underneath, no level filtering; upgrade path = real structured logging lib (pino/winston) if a server logs aggregator ever matters
function serialize(meta: unknown): unknown {
  if (meta instanceof Error) return meta.stack ?? `${meta.name}: ${meta.message}`
  if (typeof meta === "string") return meta
  try {
    return JSON.stringify(meta)
  } catch {
    return String(meta)
  }
}

export const logger = {
  info: (msg: unknown, ...meta: unknown[]) => console.log(`[INFO] ${String(msg)}`, ...meta.map(serialize)),
  warn: (msg: unknown, ...meta: unknown[]) => console.warn(`[WARN] ${String(msg)}`, ...meta.map(serialize)),
  error: (msg: unknown, ...meta: unknown[]) => console.error(`[ERROR] ${String(msg)}`, ...meta.map(serialize)),
}
