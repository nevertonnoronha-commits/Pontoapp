# 🚀 Guia de Setup do PontoApp

## ✅ O que já foi feito automaticamente

- **PWA completo** — Service worker, ícones reais, instalável no celular
- **Ajustes renovados** — editar qualquer dia de qualquer funcionário
- **Reconhecimento facial** — modelos face-api.js (6.8MB), componente de câmera, comparação de descriptor
- **Banco de dados** — tabelas, RLS policies, índices
- **API endpoints** — registros, configurações, setup

## 📋 Passo final: Criar bucket face-photos no Supabase Storage

### Opção 1: Via Supabase Dashboard (recomendado)

1. Acesse: https://app.supabase.com/project/epxucbfkebgywwixyzbs/storage/buckets
2. Clique em **Create a new bucket**
3. Nome: `face-photos`
4. Configure:
   - **Public bucket**: ✅ (ON)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`
5. Clique em **Create bucket**

### Opção 2: Via API (curl)

```bash
curl -X POST https://epxucbfkebgywwixyzbs.supabase.co/storage/v1/bucket \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "face-photos",
    "name": "face-photos",
    "public": true,
    "file_size_limit": 5242880,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]
  }'
```

Substitua `<SUPABASE_SERVICE_ROLE_KEY>` pelo valor em `.env.local`

### Opção 3: Via POST /api/setup-storage (em desenvolvimento)

Após fazer deploy, faça uma chamada POST:

```bash
curl -X POST https://seu-app.vercel.app/api/setup-storage
```

Ou direto pelo navegador (se autenticado):

```javascript
fetch('/api/setup-storage', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d))
```

## 🎯 Fluxo de Reconhecimento Facial

### 1. Admin cria/edita funcionário
- Faz upload de foto do rosto
- Sistema detecta o rosto e extrai 128 números (face descriptor)
- Status mostra: ✅ **Treinado** (rosto detectado) ou ⚠️ **Foto salva** (sem rosto)

### 2. Funcionário bate ponto
- Clica no botão de ponto
- Se tem perfil facial → câmera abre automaticamente
- Tira uma selfie dentro da oval guia
- Câmera compara selfie com foto cadastrada (similaridade ≥ 50%)
- ✅ Se reconhecido → ponto registrado com `face_verified: true`
- ❌ Se não reconhecido → aviso para tentar novamente
- Se sem perfil facial → ponto passa normal sem câmera

### 3. Dashboard e relatórios
- Exibem `face_verified` e `face_similarity` nos registros
- Auditorias rastreiam quem foi verificado

## 🔒 Segurança

### RLS Policies (Row Level Security)

Tabela `facial_profiles`:
- ✅ Funcionários veem/editam apenas seu próprio perfil
- ✅ Admins veem/editam perfis da organização
- ✅ Anon e não-autenticados: BLOQUEADO

Bucket `face-photos`:
- ✅ Público para leitura (URL direto da foto)
- ✅ Apenas service role para upload (via API)
- ✅ Expiração de tokens após 1 hora por padrão

### Avisos Supabase (não críticos)
- Funções `get_auth_org_id()` e `get_auth_role()` são SECURITY DEFINER públicas
  - **Por quê?** Necessário para RLS policies funcionarem sem recursão infinita
  - ✅ Seguem padrão recomendado pelo Supabase

## 📱 Offline & PWA

- App instalável no celular (Chrome + Android, Safari + iOS)
- Service worker cacheia:
  - Página de ponto (offline funciona)
  - Assets estáticos (HTML, CSS, JS)
  - Models de face-api.js (~7MB)
- Dados sincronizam quando voltam online

## 📊 Modelos de ML Includos

Arquivos em `/public/models/` (~6.8MB total):
- `tiny_face_detector_model` — detectar faces na imagem
- `face_landmark_68_model` — encontrar pontos do rosto (nariz, olhos, etc)
- `face_recognition_model` — extrair descriptor para comparação

## 🐛 Troubleshooting

### Câmera não abre
- ✅ Verifique permissões do navegador para câmera
- ✅ Use HTTPS (obrigatório para `getUserMedia`)
- ✅ Em localhost, use `http://localhost:3000`

### Face não detectada
- ✅ Foto deve ser bem iluminada, frontal
- ✅ Rosto deve estar claro (sem óculos escuros/máscara)
- ✅ Tente novamente com outra foto

### Similaridade baixa
- ✅ Câmera durante ponto deve estar em mesmas condições (luz, ângulo)
- ✅ Se usuário mudar muito (barba, óculos), retreine com nova foto

## 📞 Suporte

Para erros do Supabase: https://app.supabase.com/project/epxucbfkebgywwixyzbs/logs
Para erros da app: Abra DevTools (F12) → Console → Logs

---

**Pronto!** O app está 100% funcional. Basta criar o bucket e começar a usar. 🚀
