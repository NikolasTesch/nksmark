import { NextResponse } from 'next/server'
import { suggestionSchema } from '@/lib/validations/suggestion'
import prisma from '@/lib/prisma'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { SuggestionEmailTemplate } from '@/lib/email/templates/suggestion'
import { uploadFileToR2 } from '@/lib/r2/upload'
import * as React from 'react'

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let email: string | null = null
    let description = ''
    let imageUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      email = (formData.get('email') as string) || null
      description = (formData.get('description') as string) || ''
      const file = formData.get('image') as File | null

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const uploadResult = await uploadFileToR2(
          buffer,
          file.name,
          file.type || 'application/octet-stream',
          'previews'
        )
        imageUrl = uploadResult.url
      }
    } else {
      const body = await req.json()
      email = body.email || null
      description = body.description || ''
      imageUrl = body.imageUrl || null
    }

    const result = suggestionSchema.safeParse({ email, description, imageUrl })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        email: email || null,
        description,
        imageUrl: imageUrl || null,
      },
    })

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: process.env.ADMIN_EMAIL || 'admin@nksart.com.br',
          subject: 'Nova Sugestão de Arte - NKS Art',
          react: React.createElement(SuggestionEmailTemplate, {
            email: email || undefined,
            description,
            imageUrl,
          }),
        })
      } catch (err) {
        console.error('Error sending email via Resend:', err)
      }
    }

    return NextResponse.json({ success: true, data: { id: suggestion.id } }, { status: 201 })
  } catch (error) {
    console.error('Error in suggestions API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
