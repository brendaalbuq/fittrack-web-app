# FitTrack

Aplicação de gestão de ginásio desenvolvida para a UC de Programação Web (IPCA), com React, Vite e Supabase.

**Aplicação publicada:** https://fittrack-pw.netlify.app

## Correr localmente

```bash
npm install
cp .env.example .env   # preencher com os dados do Supabase (ver CREDENCIAIS.md)
npm run dev
```

## Base de dados

1. No SQL Editor do Supabase, executar `schema.sql`
2. Criar os utilizadores de teste em Authentication → Users
3. Executar `seed.sql`

Contas de teste e restantes detalhes em `CREDENCIAIS.md`.
