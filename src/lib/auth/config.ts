import { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '../prisma'
import { Role } from '@prisma/client'

export const authConfig: NextAuthConfig = {
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

        // Admin master (env). Aceita ADMIN_PASSWORD_HASH (scrypt) ou,
        // apenas em dev, senha em texto puro para facilitar o setup local.
        if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) {
          const configured = process.env.ADMIN_PASSWORD_HASH
          let ok = false
          if (configured && isHashed(configured)) {
            ok = await verifyPassword(password, configured)
          } else {
            // Fallback de desenvolvimento (mock documentado no CLAUDE.md).
            ok = password === (configured || 'admin123')
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: Role }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { role?: Role; id?: string }).role = token.role as Role;
        (session.user as { role?: Role; id?: string }).id = token.id as string;
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  }
}
