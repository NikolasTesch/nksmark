# Spec — ui-feedback-polish

## Objetivo técnico
Dar à aplicação um canal único de feedback (toast) e de estados vazios, consertar o placeholder
inexistente e adicionar gestos de toque na galeria, sem alterar layout/identidade existentes.

## Requisitos

### Funcionais
1. **RF-1 Toast global.** Adicionar `sonner` (biblioteca que o shadcn/ui adota como padrão de
   toast; leve, sem provider exótico) montado no `src/app/layout.tsx` (`<Toaster />` com tema
   alinhado aos tokens de `globals.css` — raio 2–12px, vermelho #B31217 para erro, neutro para sucesso).
   Substituir o toast artesanal de `admin/cupons/page.tsx` e os feedbacks inline de cupom no
   carrinho por chamadas `toast()` mantendo as mensagens atuais. Pontos de emissão: adicionar/remover
   do carrinho, aplicar/remover cupom (sucesso e erro da API), favoritar, sucesso/erro de download
   individual e ZIP (`DownloadModal.tsx`), copiar código Pix quando existir.
2. **RF-2 Placeholder real.** Criar `public/placeholder.svg` — SVG com a marca (fundo
   `nks-gray-100`, monograma NKS em vermelho, proporção 4:5 igual ao card) e trocar as 5
   referências a `/placeholder.jpg` (`ArtworkPreview.tsx`, `meus-downloads/page.tsx`,
   `minhas-compras/page.tsx`). Adicionar `onError` → placeholder nos `<Image>` de card onde não há fallback.
3. **RF-3 Empty states unificados.** Auditar `/carrinho` vazio, zero resultados na loja
   (`loja/page.tsx`), `useFavorites` zerado, `/minhas-compras` e `/meus-downloads` sem itens,
   `/admin/chamados` sem tickets: todos renderizando `src/components/shared/EmptyState.tsx`
   com ícone lucide + título + CTA (ex.: carrinho → "Ver a loja"; loja sem resultado → "Limpar filtros").
4. **RF-4 Gestos na galeria.** Em `ArtworkPreview.tsx`: swipe horizontal para trocar de imagem
   (Framer Motion `drag="x"` + `onDragEnd` com threshold, ou `onTouch*` nativo — preferência pela
   lib já instalada), pinch-to-zoom no modo fullscreen (escala por distância entre dois touches,
   clamp 1x–4x, pan com um dedo quando zoom >1x). Manter teclado (setas/Escape) e botões existentes.
5. **RF-5 Skeletons.** Padronizar o uso de `LoadingGrid` nos pontos onde ainda há spinner/nada
   durante fetch (loja em transição de filtro server-driven — depende da spec `loja-server-side` —,
   `/meus-downloads`, `/minhas-compras` ao carregar).

### Não-funcionais
- RFN-1: Nenhuma mudança de comportamento de dados/APIs.
- RFN-2: Bundle: `sonner` ≈ 6 kB gzip — aceitável; não adicionar outra lib de gestos (Framer Motion já está no projeto).
- RFN-3: Toasts com `aria-live="polite"` (padrão do sonner) e auto-dismiss 4s (erro: 6s + botão fechar).

## Modelagem de Dados & Contratos de API
Nenhuma. Apenas componentes/client-side.

## Critérios de Aceite & Casos de Teste
- **CA-1** Dado um cupom inválido aplicado no carrinho, quando a API responde 4xx, então aparece
  toast de erro com a mensagem do backend e o input mantém o valor.
- **CA-2** Dado um card com `previewUrl` quebrado, então o placeholder SVG renderiza (sem 404 network).
- **CA-3** Dado o carrinho vazio, então `EmptyState` com CTA "Ver a loja" é exibido (snapshot/component test Vitest).
- **CA-4** Dado mobile com galeria aberta, quando o usuário desliza horizontalmente >40px, então
  avança para a próxima imagem; pinch amplia até 4x sem scroll da página (`touch-action` adequado).
- **CA-5** `npm run test` verde; adicionar 1 component test para o wrapper de empty state da loja.

## Non-goals (técnicos)
- Sistema de notificações server-side / inbox de usuário.
- Dark mode (decisão light-only documentada em `globals.css`).
- Refatorar os hooks de fetch para cache (react-query etc.).
