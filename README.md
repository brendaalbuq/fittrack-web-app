# FitTrack

Aplicação web de gestão de ginásio desenvolvida para a UC de Programação Web (IPCA), com React, Vite e Supabase.

**Aplicação publicada:** https://fittrack-pw.netlify.app

## Experimente

Pode entrar com qualquer uma das contas de demonstração (password: `fittrack123`):

| Perfil | E-mail |
|---|---|
| Administrador | admin@fittrack.pt |
| Instrutor | instrutor@fittrack.pt |
| Membro | membro@fittrack.pt |

## Funcionalidades

- **Administrador:** gestão de membros, estúdios e equipamentos, aprovação de pedidos pendentes e relatórios
- **Instrutor:** criação e gestão de aulas, disponibilidade, lista de inscritos e pedidos de treino personalizado
- **Membro:** inscrição em aulas, gestão das próprias inscrições, perfil e pedido de treino personalizado

## Tecnologias

React · Vite · Supabase (autenticação e base de dados PostgreSQL) · Netlify

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
