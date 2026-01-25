# Quick Start Guide - OnSite Timekeeper Web

## 🚀 Deploy em 5 Minutos

### Pré-requisitos
- Conta no Vercel (grátis)
- Conta no Mapbox (grátis)
- Supabase já configurado (do app mobile)

### Passo 1: Configurar Mapbox

1. Acesse https://mapbox.com e crie conta
2. Vá em https://account.mapbox.com/access-tokens
3. Copie o **Default Public Token** (começa com `pk.`)

### Passo 2: Preparar .env.local

Crie arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwiYSI6ImNscXh5ejN6ZjBxdXEya3BsdWNxeXd6enQifQ...
```

### Passo 3: Instalar e Testar Local

```bash
# Instalar dependências
npm install

# Rodar dev server
npm run dev
```

Abra http://localhost:3000 e teste o login.

### Passo 4: Deploy no Vercel

#### Opção A: Via Git (Recomendado)

```bash
# Inicializar git (se ainda não tiver)
git init
git add .
git commit -m "Initial commit"

# Push para GitHub
gh repo create onsite-timekeeper-web --private --source=. --remote=origin --push
```

Depois:
1. Acesse https://vercel.com/new
2. Import repository
3. Adicione as 3 variáveis de ambiente
4. Deploy!

#### Opção B: Via Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Seguir prompts e adicionar env vars quando solicitado
```

### Passo 5: Configurar Supabase

No Supabase Dashboard:

1. **Authentication** → **URL Configuration**
   - Adicionar `https://seu-app.vercel.app` nas Redirect URLs
   - Adicionar `https://seu-app.vercel.app/api/auth/callback` 

2. **Verificar RLS Policies**
   - Confirmar que policies de `locations`, `records`, `access_grants` estão ativas

### Passo 6: Testar em Produção

1. Acesse seu domínio Vercel
2. Faça login com uma conta do app mobile
3. Teste cada funcionalidade:
   - ✅ Entrada manual de horas
   - ✅ Adicionar local no mapa
   - ✅ Gerar relatório
   - ✅ QR code linking

## 🐛 Troubleshooting

### "Map failed to load"
- Token do Mapbox está correto?
- Variável começa com `pk.`?
- Token está ativo no dashboard do Mapbox?

### "Authentication failed"
- Supabase URL e ANON_KEY estão corretos?
- Redirect URL está configurado no Supabase?

### "Camera permission denied"
- HTTPS é obrigatório para QR scanner
- Localhost funciona para testes

### Dados não sincronizam com app
- Confirme que está usando o MESMO Supabase
- Verifique se o user_id é o mesmo

## 📱 Custom Domain (Opcional)

No Vercel:
1. Settings → Domains
2. Adicione: `timekeeper.onsiteclub.ca`
3. Configure DNS no seu registrar
4. Aguarde propagação (5-30min)

Depois, atualize Redirect URLs no Supabase com o novo domínio.

## ✅ Checklist Pós-Deploy

- [ ] Login funciona
- [ ] Entrada manual salva corretamente
- [ ] Mapa carrega e permite adicionar locais
- [ ] Relatório gera com formato correto
- [ ] QR code gera e escaneia
- [ ] Dados sincronizam com app mobile
- [ ] Responsivo mobile funciona bem
- [ ] SSL/HTTPS ativo (automático no Vercel)

## 🔄 Próximas Atualizações

Para atualizar o site após mudanças:

```bash
git add .
git commit -m "Sua mensagem"
git push

# Vercel deploya automaticamente!
```

## 📊 Monitoramento

No Vercel Dashboard você pode ver:
- Analytics de acesso
- Logs de erros
- Performance metrics

---

**Dúvidas?** Verifique o README.md principal ou os logs no Vercel.
