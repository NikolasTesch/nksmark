import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const KEY_LENGTH = 64

/**
 * Gera um hash seguro de senha usando scrypt (nativo do Node, sem dependências externas).
 * Formato armazenado: "<salt-hex>:<derived-key-hex>".
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

/**
 * Verifica uma senha em texto puro contra um hash gerado por hashPassword.
 * Usa comparação em tempo constante para evitar timing attacks.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false

  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer

  if (keyBuffer.length !== derivedKey.length) return false
  return timingSafeEqual(keyBuffer, derivedKey)
}

/** Indica se uma string tem o formato de hash scrypt ("salt:key"). */
export function isHashed(value: string): boolean {
  const parts = value.split(':')
  return parts.length === 2 && parts.every((p) => /^[0-9a-f]+$/i.test(p) && p.length > 0)
}
