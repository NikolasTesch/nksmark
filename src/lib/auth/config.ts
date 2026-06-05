import { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '../prisma'
import { Role } from '@prisma/client'
import { edgeAuthConfig } from './edge-config'

export const authConfig: NextAuthConfig = {
  ...edgeAuthConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).trim().toLowerCase()
        const password = credentials.password as string

        // Rejeita inputs absurdos antes de qualquer trabalho (defesa básica
        // contra payloads gigantes e e-mails malformados).
        if (email.length > 254 || password.length > 200) {
          return null
        }

        // Rate limit ANTES do scrypt: além de frear brute-force online por IP,
        // evita gastar CPU com a verificação cara em uma enxurrada de tentativas.
        // Chave combina IP + e-mail para não punir usuários distintos atrás do
        // mesmo proxy mais do que o necessário.
        const { rateLimit, getClientIp } = await import('../rate-limit')
        const ip = await getClientIp()
        const limited = rateLimit(`login:${ip}:${email}`, 5, 60_000).success === false
        const ipLimited = rateLimit(`login:ip:${ip}`, 20, 60_000).success === false
        if (limited || ipLimited) {
          return null
        }

        const { verifyPassword, isHashed } = await import('./password')

        // Admin master (env). Exige verificação estrita contra ADMIN_PASSWORD_HASH (scrypt).
        if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) {
          const configured = process.env.ADMIN_PASSWORD_HASH
          let ok = false
          if (configured && isHashed(configured)) {
            ok = await verifyPassword(password, configured)
          }
          if (ok) {
            return {
              id: 'admin',
              name: 'NKS Admin',
              email: process.env.ADMIN_EMAIL,
              role: Role.ADMIN
            }
          }
          return null
        }

        // Usuário do banco — exige senha cadastrada e verificada.
        const user = await prisma.user.findUnique({
          where: { email }
        })

        // Aceita equipe interna (FASE/ADMIN) e clientes pagantes (CLIENT).
        if (
          user &&
          (user.role === Role.CLIENT || user.role === Role.FASE || user.role === Role.ADMIN) &&
          (await verifyPassword(password, user.passwordHash))
        ) {
          return {
            id: user.id,
            name: user.name || (user.role === Role.CLIENT ? 'Cliente' : 'Equipe Interna'),
            email: user.email,
            role: user.role
          }
        }

        return null
      }
    })
  ]
}
