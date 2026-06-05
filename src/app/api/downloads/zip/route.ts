import { NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import archiver from 'archiver'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Role, Status } from '@prisma/client'
import { zipDownloadRequestSchema } from '@/lib/validations/download'
import { protectDownloadRoute } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { s3Client, R2_BUCKET_NAME } from '@/lib/r2/client'
import { deriveFileKey } from '@/lib/r2/file-key'
import { canDownloadArtwork } from '@/lib/payments/access'
import { rateLimit } from '@/lib/rate-limit'

// Streaming de arquivos + SDK AWS exigem o runtime Node (não Edge).
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const authStatus = await protectDownloadRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const userId = authStatus.user?.id as string
    const userRole = (authStatus.user as { role?: Role } | undefined)?.role

    // Mesmo limite do download avulso: protege contra raspagem do acervo.
    const limit = rateLimit(`download:${userId}`, 30, 60_000)
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Muitos downloads em sequência. Aguarde um momento e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    const body = await req.json()
    const result = zipDownloadRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { artworkId } = result.data

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { files: true },
    })

    if (!artwork) {
      return NextResponse.json(
        { success: false, error: 'Arte não localizada.' },
        { status: 404 }
      )
    }

    // Só é permitido baixar artes efetivamente publicadas no catálogo.
    if (artwork.status !== Status.PUBLISHED) {
      return NextResponse.json(
        { success: false, error: 'Esta arte não está disponível para download.' },
        { status: 403 }
      )
    }

    if (artwork.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Esta arte não possui arquivos para download.' },
        { status: 404 }
      )
    }

    // Cliente só baixa arte que comprou (ou arte grátis). FASE/ADMIN baixam livre.
    const allowed = await canDownloadArtwork({
      userId,
      role: userRole,
      artworkId,
      isFree: artwork.isFree,
    })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você precisa comprar esta arte antes de baixá-la.' },
        { status: 403 }
      )
    }

    // O admin master vem do .env (id fixo 'admin') e não possui linha em User.
    // Como Download.userId é FK obrigatória, garantimos a linha antes de registrar
    // os downloads — caso contrário a criação violaria a constraint (erro 500).
    if (userId === 'admin') {
      await prisma.user.upsert({
        where: { id: 'admin' },
        update: {},
        create: {
          id: 'admin',
          email: (process.env.ADMIN_EMAIL || 'admin@nksart.com.br').toLowerCase(),
          name: 'NKS Admin',
          role: Role.ADMIN,
        },
      })
    }

    // Nome base usado no .zip e nas entradas internas. Sanitizado para não
    // quebrar/injetar no header Content-Disposition nem no caminho do zip.
    const safeTitle = artwork.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 100) || 'arte'

    // Monta o .zip por streaming: cada objeto é puxado do R2 e anexado conforme
    // o cliente vai consumindo a resposta, evitando carregar tudo em memória.
    const archive = archiver('zip', { zlib: { level: 9 } })
    // Sem listener de erro, uma falha no stream derrubaria o processo.
    archive.on('error', (err) => {
      console.error('Error building zip archive:', err)
      archive.destroy(err)
    })

    // Dispara todos os GetObject em paralelo para sobrepor a latência de
    // abertura das conexões; Promise.all preserva a ordem dos arquivos.
    // (O archiver ainda comprime uma entrada por vez — o ganho é só de I/O.)
    const objects = await Promise.all(
      artwork.files.map((file) =>
        s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: deriveFileKey(file.url) }))
      )
    )

    const usedNames = new Set<string>()

    objects.forEach((obj, i) => {
      const ext = artwork.files[i].format.toLowerCase()
      let name = `${safeTitle}.${ext}`
      // Dois arquivos do mesmo formato colidiriam: sufixa com índice.
      if (usedNames.has(name)) {
        name = `${safeTitle}-${i + 1}.${ext}`
      }
      usedNames.add(name)

      archive.append(obj.Body as Readable, { name })
    })

    // Não aguardamos: a finalização emite os bytes finais à medida que a
    // resposta é lida pelo cliente.
    void archive.finalize()

    // Registra um Download por arquivo, mantendo o histórico fiel ao avulso.
    await prisma.download.createMany({
      data: artwork.files.map((f) => ({ userId, artworkId, fileId: f.id })),
    })

    const webStream = Readable.toWeb(archive) as unknown as ReadableStream

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeTitle}.zip"`,
      },
    })
  } catch (error) {
    console.error('Error in zip downloads API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
