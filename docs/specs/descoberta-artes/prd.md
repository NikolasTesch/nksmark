# PRD — descoberta-artes

> **Status:** 🔴 **NÃO IMPLEMENTADO (Backlog)**  
> **Data:** 2026-09-17  
> **Nota de Implementação:** Nem a agregação avançada de relacionadas por sobreposição de tags nem o modelo `Review` (avaliações/estrelas) foram criados no schema ou implementados no código. A página `/loja/[slug]` permanece exibindo artes da mesma categoria via `categoryId`.

## Problema
A página de detalhe (`/loja/[slug]`) mostra "relacionadas" só por mesma categoria (máx. 5,
`/api/artworks?categoryId=`), ignorando tags — o sinal mais rico do catálogo (M2M `Artwork.tags`)
— e o grid de cards não comunica confiança social: não existem avaliações. Loja sem prova social
converte menos e o visitante que termina um produto não tem próximo passo além de voltar à busca.

## Persona afetada
Cliente comprando arte de sublimação (decisão estética, com paralelismo/combinado entre arquivos);
admin que ganha sinal de demanda (quais artes satisfazem ou decepcionam).

## Métricas de sucesso
- CTR em "Artes relacionadas" ≥ 8% das visitas de detalhe.
- ≥ 15% dos pedidos PAID geram ao menos 1 review em 60 dias.
- Nota média visível em ≥ 60% das artes com vendas.
- (Revisado após 1 mês de catálogo com reviews.)

## Fora de escopo (produto)
- Respostas do lojista ao review, fotos do cliente, reviews anônimos, import de avaliações externas.
- Recomendação por histórico/ML — heurística de tags basta nesta fase.
- Favoritos persistidos no servidor (outra spec do roadmap, não escolhida).
