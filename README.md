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

1. Criar um ficheiro `.env` na raiz do projeto com o seguinte conteúdo:

```
VITE_SUPABASE_URL=https://skkopphwlpxypfkdaphc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNra29wcGh3bHB4eXBma2RhcGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDc1OTEsImV4cCI6MjA5MTMyMzU5MX0.u2q4QP1Mm2-tZyvw6oXQSO0SiO-BFWZrQk1Mv13ZNuc
```

2. Instalar as dependências e iniciar:

```bash
npm install
npm run dev
```

## Base de dados

1. No SQL Editor do Supabase, executar `schema.sql`
2. Criar os utilizadores de teste em Authentication → Users
3. Executar `seed.sql`
