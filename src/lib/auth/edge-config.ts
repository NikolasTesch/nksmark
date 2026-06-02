import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@prisma/client'

/**
 * Config base compatível com Edge Runtime — usada pelo `middleware.ts`.
 *
 * NÃO pode importar Prisma, `password.ts` ou qualquer módulo nativo do Node
 * (`crypto`, `util`), pois o middleware roda no Edge Runtime, onde esses
 * módulos não existem. Os providers (Credentials, que usa Prisma + scrypt)
 * vivem apenas na config completa em `config.ts`, carregada nas rotas Node.
 *
 * Com `session.strategy = 'jwt'`, o middleware só precisa decodificar o token
 * e aplicar os callbacks abaixo — sem acesso ao banco.
 */
export const edgeAuthConfig: NextAuthConfig = {
  providers: [],
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
    strategy: 'jwt',
    // 8h para admin/equipe interna — minimiza a janela de exposição se uma sessão
    // for comprometida (ex.: máquina sem lock, token em clipboard).
    maxAge: 8 * 60 * 60,
  }
}
