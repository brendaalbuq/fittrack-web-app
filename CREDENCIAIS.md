# FitTrack — Credenciais

## Supabase
URL: https://skkopphwlpxypfkdaphc.supabase.co  
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNra29wcGh3bHB4eXBma2RhcGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDc1OTEsImV4cCI6MjA5MTMyMzU5MX0.u2q4QP1Mm2-tZyvw6oXQSO0SiO-BFWZrQk1Mv13ZNuc

## Contas de teste (password: fittrack123)
- admin@fittrack.pt — Administrador  
- instrutor@fittrack.pt — Instrutor  
- membro@fittrack.pt — Membro  

## Correr localmente
```
npm install
npm run dev
```

O ficheiro `.env` já está incluído nesta entrega para a aplicação conseguir ligar ao Supabase ao correr localmente.

## Setup da base de dados
1. SQL Editor → colar `schema.sql` → Run  
2. Criar os 3 utilizadores em Authentication → Users  
3. SQL Editor → colar `seed.sql` → Run  
