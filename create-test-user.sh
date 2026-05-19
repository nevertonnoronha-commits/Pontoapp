#!/bin/bash

# Criar usuário de teste via Supabase Admin API
SUPABASE_URL="https://epxucbfkebgywwixyzbs.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVweHVjYmZrZWJneXd3aXh5emJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE3NzQzMywiZXhwIjoyMDk0NzUzNDMzfQ.MQNquD9vpOSxRkFfSaVG4hTNtnxvA2tk7jnhbzO9iX0"

echo "🚀 Criando usuário de teste no Supabase Auth..."

# Criar usuário via API
curl -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "Teste@123456",
    "email_confirm": true,
    "user_metadata": {
      "name": "João Teste"
    }
  }' | jq .

echo ""
echo "✅ Usuário criado! Agora vou criar o perfil no banco..."
