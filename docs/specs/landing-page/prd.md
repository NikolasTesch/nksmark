# PRD — landing-page

> **Status:** 🔴 **NÃO IMPLEMENTADO (Backlog)**  
> **Data:** 2026-09-17  
> **Nota de Implementação:** A rota raiz (`src/app/page.tsx`) continua executando `redirect('/loja')`. Nenhuma das seções ou metadados foi implementada no código.

## Problema
Hoje `/` é um redirect seco para `/loja` (hero removida na Fase 2). Um visitante frio — vindo de
link no Instagram, Google ou cartão de visita — chega direto numa grade de produtos sem nenhuma
explicação do que é a NKS Art, para quem é, por que baixar arquivos vetoriais aqui, e sem funil
de confiança (números, novidades, CTA de cadastro). Isso custa conversão e também SEO de marca
(a página mais linkada do domínio não tem conteúdo).

## Persona afetada
Visitante novo (VISITOR, não autenticado) em desktop e mobile; Google/robôs de preview de link.

## Métricas de sucesso
- `/` responde 200 com conteúdo (em vez de redirect) e mantém CTR para `/loja` ≥ taxa atual.
- Open Graph/preview de link no WhatsApp/Instagram mostra título, descrição e imagem da marca.
- Tempo médio de sessão de VISITOR em `/` > 15s (baseline hoje ≈ 0, é redirect).
- Zero impacto no bundle JS das demais rotas (landing é Server Component estático).

## Fora de escopo (produto)
- Blog/CMS, depoimentos com fotos, seção de preços por plano (vem com `billing-fase3`), cadastros
  de newsletter.
- Qualquer mudança em `/loja` além de manter o redirect antigo como alias se necessário.
