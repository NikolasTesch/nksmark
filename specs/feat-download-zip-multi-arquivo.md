# Spec: Download em .zip para artes com múltiplos arquivos

## Objetivo

Quando uma arte tiver **mais de um arquivo** (ex.: um `.cdr` + um `.otf`), o usuário FASE/ADMIN
deve poder baixar **um único arquivo `.zip`** contendo todos os arquivos da arte, em vez de
precisar baixar cada arquivo individualmente em ações separadas.

## Contexto / comportamento atual

Hoje o download é **arquivo por arquivo** (não há ZIP):

- `DownloadModal.tsx` lista cada arquivo numa linha própria com botão "Baixar" individual, e
  desabilita os demais botões enquanto um download está em andamento (sequencial).
- `POST /api/downloads` recebe um único `fileId`, gera **uma** URL assinada do R2
  (`getSignedDownloadUrl`) e grava **um** registro `Download` por arquivo.
- O front (`/loja/[slug]/page.tsx → handleDownloadRequest`) cria um `<a download>` e dispara o
  download daquele arquivo isolado.

Resultado: arte com 2 arquivos = 2 cliques, 2 downloads, 2 registros no histórico.

## Escopo

### O que faz

1. Adiciona um novo endpoint `POST /api/downloads/zip` que:
   - recebe `{ artworkId }`,
   - valida permissão FASE/ADMIN (`protectFaseRoute`) e rate limit,
   - busca todos os `File` da arte (arte precisa estar `PUBLISHED`),
   - faz fetch de cada objeto do R2 (via cliente S3 server-side), monta um `.zip` em memória
     usando streaming e devolve o `.zip` como resposta (`Content-Type: application/zip`,
     `Content-Disposition: attachment; filename="<titulo>.zip"`),
   - registra **um `Download` por arquivo** incluído no zip (mantém o histórico fiel —
     reaproveita o upsert do admin master já existente no endpoint atual).
2. No `DownloadModal.tsx`:
   - Se a arte tiver **2+ arquivos**, exibir um botão de destaque **"Baixar todos (.zip)"** no
     topo da lista, além de manter os botões individuais por arquivo (download avulso continua
     disponível para quem quer só um formato).
   - Se a arte tiver **apenas 1 arquivo**, manter exatamente o comportamento atual (sem botão zip).
3. No `/loja/[slug]/page.tsx`: adicionar `handleZipDownloadRequest(artworkId)` que chama o novo
   endpoint, recebe o blob e dispara o download via `<a download>` + `URL.createObjectURL`.

### O que NÃO faz

- Não altera o schema do Prisma (a tabela `Download` continua um registro por `fileId`).
- Não remove o download individual por arquivo.
- Não muda regras de permissão, rate limit ou status de arte.
- Não cobre marca d'água, pagamento ou qualquer item de Fase 2.

## Mudanças no modelo de dados

Nenhuma. O `.zip` é montado em runtime; nada é persistido no R2.

## Endpoints afetados

| Método | Rota | Mudança |
|---|---|---|
| `POST` | `/api/downloads/zip` | **Novo.** Recebe `{ artworkId }`, retorna binário `.zip`. |
| `POST` | `/api/downloads` | Inalterado (download avulso por `fileId`). |

### Validação (Zod)

Adicionar em `src/lib/validations/download.ts`:

```ts
export const zipDownloadRequestSchema = z.object({
  artworkId: idSchema,
})
export type ZipDownloadRequestInput = z.infer<typeof zipDownloadRequestSchema>
```

### Contrato de resposta

- **Sucesso:** binário `.zip` (não usa o envelope `ApiResponse<T>`, pois é stream de arquivo).
  Headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="<slug>.zip"`.
- **Erros:** mantêm o envelope JSON `ApiResponse` padrão:
  - `400` body inválido (Zod `error.issues[0].message`),
  - `401/403` sem permissão / arte não publicada,
  - `404` arte não encontrada ou sem arquivos,
  - `429` rate limit,
  - `500` erro inesperado (`console.error`).

## Componentes / páginas impactadas

- `src/lib/validations/download.ts` — novo schema `zipDownloadRequestSchema`.
- `src/app/api/downloads/zip/route.ts` — **novo** Route Handler.
- `src/components/artwork/DownloadModal.tsx` — botão "Baixar todos (.zip)" condicional
  (`files.length > 1`) + estado de loading próprio para o zip.
- `src/app/loja/[slug]/page.tsx` — `handleZipDownloadRequest` e passagem da prop ao modal.

## Detalhes de implementação

- **Geração do ZIP:** usar uma lib de zip por streaming compatível com runtime Node do
  Next 16. Sugestão: `archiver` (popular, streaming) ou `jszip` (mais simples, em memória).
  Para arquivos `.cdr` grandes, preferir **streaming** (`archiver`) para não estourar memória.
  > Decisão de lib a confirmar na implementação; default sugerido: `archiver`.
- **Busca dos objetos no R2:** reutilizar `s3Client` e `R2_BUCKET_NAME` de `@/lib/r2/client`
  com `GetObjectCommand`; derivar a `fileKey` a partir de `file.url` com a mesma lógica já usada
  em `/api/downloads` (`url.substring(url.indexOf('files/'))`). Considerar extrair essa derivação
  para um helper compartilhado (`@/lib/r2/file-key.ts`) para evitar duplicação.
- **Nome dos arquivos dentro do zip:** `<slug-ou-titulo-sanitizado>.<format>`; em caso de dois
  arquivos com mesmo formato, sufixar com índice (`-1`, `-2`) para evitar colisão.
- **Runtime:** o Route Handler deve rodar em Node (`export const runtime = 'nodejs'`), não Edge,
  por causa do streaming de arquivos / SDK AWS.
- **Registro de Download:** criar os registros (`prisma.download.create`) para todos os `fileId`
  incluídos, idealmente em `createMany`, após o zip ser montado com sucesso.

## Critérios de aceitação

1. Arte com 2+ arquivos exibe botão "Baixar todos (.zip)" no modal; arte com 1 arquivo não exibe.
2. Clicar em "Baixar todos (.zip)" baixa um único `.zip` contendo **todos** os arquivos da arte,
   com nomes legíveis e sem colisão de nomes.
3. O download avulso por arquivo continua funcionando como antes.
4. Visitante (sem FASE/ADMIN) não consegue acionar o zip (403), igual ao download avulso.
5. O histórico "Meus Downloads" registra um item por arquivo incluído no zip.
6. Rate limit e validação Zod aplicados ao novo endpoint.
7. Estados visuais (loading/success/error) presentes no botão zip do modal.
8. **Testes** acompanham a entrega (regra `testing_and_implementation`):
   - `src/app/api/downloads/zip/route.test.ts`: permissão, arte não publicada, 404 sem arquivos,
     registro de Download por arquivo, mock do R2 e da lib de zip.
   - Atualizar/estender testes do `DownloadModal` para a renderização condicional do botão zip.

## Riscos

- **Memória/timeout** ao zipar arquivos grandes (`.cdr` pesados) → mitigar com streaming
  (`archiver`) e runtime Node; avaliar limite de tamanho total.
- **Latência** de baixar N objetos do R2 e remontar o zip → pode ser perceptível; mostrar loading
  claro no botão. Possível otimização futura: paralelizar os `GetObject`.
- **Custo de egress** do R2 (arquivo trafega R2 → servidor → cliente, em vez de URL assinada
  direta). Aceitável para o volume interno da equipe FASE.
- **Compatibilidade da lib de zip** com o runtime do Next 16 — validar no ambiente antes de fixar.

## Atualizações de documentação ao concluir

- `spec.md` e `PRD.md`: registrar a nova rota `POST /api/downloads/zip` e o comportamento de
  download agrupado para artes multi-arquivo (a regra "download sempre via URL assinada" passa a
  ter exceção: o zip é servido pelo backend, não por URL assinada direta).
