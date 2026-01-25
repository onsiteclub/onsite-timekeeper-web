# OnSite Timekeeper - Web Portal

Web portal complementar ao app mobile OnSite Timekeeper. Permite entrada manual de horas, gerenciamento de locais, relatórios e team linking via QR code.

## Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Supabase SSR
- **Maps**: react-map-gl (Mapbox)
- **QR Code**: qrcode.react + html5-qrcode
- **Deploy**: Vercel

## Setup

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

Para obter o Mapbox token:
1. Crie conta em https://mapbox.com
2. Acesse https://account.mapbox.com/access-tokens
3. Copie o Default Public Token ou crie um novo

### 3. Rodar Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000

## Funcionalidades

### ✅ Fase 1: Setup & Auth
- [x] Login/Logout com Supabase
- [x] Middleware de proteção de rotas
- [x] Layout base (Header + Sidebar)

### ✅ Fase 2: Core Features
- [x] Dashboard home
- [x] Entrada manual de horas
- [x] Listagem de sessões do dia
- [x] Summary card com total de horas

### ✅ Fase 3: Locations
- [x] Mapa interativo (Mapbox)
- [x] Adicionar local via click no mapa
- [x] Lista de locais existentes
- [x] Editar/Deletar local (soft delete)

### ✅ Fase 4: Reports
- [x] Calendário mensal
- [x] Detalhe do dia com sessões
- [x] Geração de relatório formatado
- [x] Código de referência (Ref #)
- [x] Exportar como texto (copy/download)

### ✅ Fase 5: Team Linking
- [x] Gerar QR code (5min expiry)
- [x] Escanear QR code
- [x] Aceitar/Revogar grants
- [x] Ver lista de managers/workers

### 🔄 Fase 6: Polish (A fazer)
- [ ] Loading states (skeletons)
- [ ] Error boundaries
- [ ] Toasts de feedback
- [ ] Testes responsivos mobile
- [ ] Deploy no Vercel

## Estrutura de Arquivos

```
app/
  (auth)/
    login/page.tsx          # Página de login
  (dashboard)/
    dashboard/
      page.tsx              # Home - entrada manual
      locations/page.tsx    # Mapa de locais
      reports/page.tsx      # Relatórios mensais
      team/page.tsx         # QR code linking
    layout.tsx              # Layout com sidebar
  api/
    auth/callback/route.ts  # Callback do Supabase
  globals.css               # Estilos globais
  layout.tsx                # Root layout

components/
  ui/                       # Componentes base
    Button.tsx
    Input.tsx
    Modal.tsx
  Header.tsx                # Header do dashboard
  Sidebar.tsx               # Navegação lateral
  ManualEntryForm.tsx       # Form de entrada de horas
  LocationMap.tsx           # Mapa de locais
  ReportGenerator.tsx       # Gerador de relatórios
  QRCodeGenerator.tsx       # Gerador de QR code
  QRCodeScanner.tsx         # Scanner de QR code

lib/
  supabase/
    client.ts               # Browser client
    server.ts               # Server client
  reports.ts                # Lógica de relatórios
  utils.ts                  # Helpers gerais

types/
  database.ts               # Types do Supabase
```

## Deploy

### Vercel

1. Push para GitHub
2. Importar no Vercel
3. Adicionar variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
4. Deploy automático

### Supabase

Certifique-se que as tabelas estão criadas:
- `locations`
- `records`
- `access_grants`
- `pending_tokens`
- `profiles` (opcional, para nomes de usuário)

RLS policies devem estar ativas para proteger os dados.

## Troubleshooting

### Mapbox não aparece
- Verifique se `NEXT_PUBLIC_MAPBOX_TOKEN` está configurado
- Token deve começar com `pk.`
- Confirme que o token está ativo no Mapbox dashboard

### Login não funciona
- Verifique se as credenciais do Supabase estão corretas
- Confirme que o usuário existe no Supabase Auth
- Middleware pode estar bloqueando rotas

### QR Code não escaneia
- Camera precisa de permissão HTTPS (use localhost ou deploy)
- Verifique se o token não expirou (5 minutos)
- QR code deve ser do OnSite Timekeeper

## Próximos Passos

1. Implementar toasts de feedback (react-hot-toast)
2. Adicionar loading skeletons
3. Criar error boundaries
4. Melhorar responsividade mobile
5. Adicionar testes (Vitest + Testing Library)
6. Setup CI/CD com GitHub Actions
7. Analytics (Vercel Analytics)

## Licença

Propriedade de OnSite Club
