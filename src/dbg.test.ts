import { describe, it } from 'vitest'
import { hashPassword } from './lib/auth/password'

describe('dbg', () => {
  it('reproduz authorize manualmente', async () => {
    const hash = await hashPassword('minhaSenha8')
    const mod = await import('./lib/auth/password')
    const ok = await mod.verifyPassword('minhaSenha8', hash)
    console.log('DBG verify via dynamic import =', ok, '| hash=', hash.slice(0, 20))
  })
})
