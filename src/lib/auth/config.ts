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

        if (
          user &&
          (user.role === Role.FASE || user.role === Role.ADMIN) &&
          (await verifyPassword(password, user.passwordHash))
        ) {
          return {
            id: user.id,
            name: user.name || 'Equipe Interna',
            email: user.email,
            role: user.role
          }
        }

        return null
      }
    })
  ]
}
