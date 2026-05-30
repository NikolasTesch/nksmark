import { auth } from './auth'
import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function protectAdminRoute() {
  const session = await auth()

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login primeiro.' },
        { status: 401 }
      ),
    }
  }

  if ((session.user as { role?: Role }).role !== Role.ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Apenas administradores.' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user: session.user,
  }
}

export async function protectFaseRoute() {
  const session = await auth()

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login primeiro.' },
        { status: 401 }
      ),
    }
  }

  const role = (session.user as { role?: Role }).role
  if (role !== Role.FASE && role !== Role.ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Permissão insuficiente.' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user: session.user,
  }
}
