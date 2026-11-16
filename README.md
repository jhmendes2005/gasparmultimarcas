# Gaspar Multimarcas Monorepo

Este repositório contém:

- `proj-carro-backend` (NestJS + Prisma)
- `proj-carros-frontend` (Next.js)

## Nova experiência Gaspar

O redesign está em [`gaspar-redesign`](./gaspar-redesign/README.md), com catálogo,
comparador, favoritos, painel administrativo, upload de fotos e integração
preparada para S3/R2, Google Tag Manager e Meta Pixel.

```bash
npm --prefix gaspar-redesign ci
npm --prefix gaspar-redesign run dev
```

Site: http://127.0.0.1:4173 · Painel: http://127.0.0.1:4173/admin

Esta versão ainda não foi integrada ao deploy Vercel existente. O backend usa
PostgreSQL / Neon quando `DATABASE_URL` está configurada, incluindo sessões.
Antes do deploy serverless, configure o bucket e o adaptador de rotas do backend.

## Deploy na Vercel

A raiz tem um `vercel.json` que publica frontend e backend juntos no mesmo projeto da Vercel.

- Frontend: rotas do site
- Backend: exposto em `/api/*`

No frontend, as chamadas usam `/api` em produção (mesmo dominio).

## Desenvolvimento local

Em terminais separados:

```bash
npm run dev:back
npm run dev:front
```

Backend local padrao: `http://localhost:3001`
Frontend local padrao: `http://localhost:3000`

## Variaveis na Vercel

Defina no projeto da Vercel (Environment Variables):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `TYPE_WEBHOOK_URL`

Opcional no frontend (normalmente nao precisa):

- `NEXT_PUBLIC_API_URL` (se quiser sobrescrever `/api`)
