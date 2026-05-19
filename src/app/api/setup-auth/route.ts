import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();
  const adminEmail = "camaleao.presente@gmail.com";
  const adminPassword = "Ponto@Admin123";

  console.log("🚀 Iniciando setup de autenticação...\n");

  try {
    // 1. Criar organização
    console.log("1️⃣ Criando organização...");
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: "Minha Loja",
        plan: "free",
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log(`✅ Organização criada: ${org.id}\n`);

    // 2. Criar auth user
    console.log(`2️⃣ Criando usuário admin: ${adminEmail}`);

    // Verificar se já existe
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const alreadyExists = existingAuth?.users?.some(u => u.email === adminEmail);

    let authUser: any;
    if (alreadyExists) {
      console.log("   ⚠️ Usuário já existe no auth");
      // Pegar o user existente
      const { data } = await supabase.auth.admin.getUserById(
        existingAuth.users.find(u => u.email === adminEmail)?.id || ""
      );
      authUser = data.user;
    } else {
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Erro ao criar auth user: ${authError.message}`);
      }

      authUser = data.user;
      console.log(`✅ Usuário admin criado: ${authUser?.id}\n`);
    }

    if (!authUser) {
      throw new Error("Falha ao obter usuário de autenticação");
    }

    // 3. Criar user no banco
    console.log("3️⃣ Criando user no banco...");
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        organization_id: org.id,
        name: "Admin Loja",
        email: adminEmail,
        role: "admin",
        is_active: true,
      })
      .select()
      .single();

    if (userError && !userError.message.includes("duplicate")) {
      throw userError;
    }

    if (userError?.message.includes("duplicate")) {
      console.log("   ⚠️ User já existe no banco");
    } else {
      console.log(`✅ User criado no banco: ${userData.id}\n`);
    }

    // 4. Criar store_configs
    console.log("4️⃣ Criando configuração da loja...");
    const { data: storeConfig, error: storeError } = await supabase
      .from("store_configs")
      .insert({
        organization_id: org.id,
        store_name: "Minha Loja",
        wifi_ssid: "WiFi-Padrão",
        gps_latitude: -23.5505,
        gps_longitude: -46.6333,
        gps_radius_meters: 200,
        updated_by: authUser.id,
      })
      .select()
      .single();

    if (storeError) throw storeError;
    console.log("✅ Loja configurada!\n");

    // 5. Criar funcionário de teste
    console.log("5️⃣ Criando funcionário de teste...");
    const testPassword = "Teste@123456";

    const { data: testAuth, error: testAuthError } = await supabase.auth.admin.createUser({
      email: "joao@example.com",
      password: testPassword,
      email_confirm: true,
    });

    if (testAuthError) {
      console.log(`   ⚠️ Erro ao criar teste: ${testAuthError.message}`);
    } else {
      await supabase
        .from("users")
        .insert({
          id: testAuth.user.id,
          organization_id: org.id,
          name: "João Teste",
          email: "joao@example.com",
          role: "employee",
          is_active: true,
        });

      await supabase
        .from("employee_profiles")
        .insert({
          user_id: testAuth.user.id,
          organization_id: org.id,
          job_title: "Vendedor",
          salary: 2500,
          daily_hours: 8,
          monthly_hours: 220,
          compensation_type: "payment",
          lunch_break_minutes: 60,
          admission_date: new Date().toISOString().split("T")[0],
        });

      console.log("✅ Funcionário de teste criado!\n");
    }

    // Resposta
    const response = {
      success: true,
      message: "✨ SETUP COMPLETO! Seu app está pronto para usar.",
      credentials: {
        admin: {
          email: adminEmail,
          password: adminPassword,
          note: "💡 Após fazer login, você pode mudar a senha em seu perfil",
        },
        testEmployee: {
          email: "joao@example.com",
          password: testPassword,
          note: "Para testar como funcionário",
        },
      },
      nextSteps: [
        "🔵 Abra o navegador",
        "🔗 Acesse: http://localhost:3000",
        `📧 Faça login com: ${adminEmail}`,
        `🔐 Senha: ${adminPassword}`,
        "✅ Você será redirecionado para o DASHBOARD",
        "",
        "⚙️ CONFIGURAR A LOJA:",
        "1. Clique em ⚙️ CONFIGURAÇÕES",
        "2. Clique em '📌 Usar minha localização atual' (permite GPS)",
        "3. Edite o nome da loja se quiser",
        "4. Clique em '💾 Salvar Configurações'",
        "",
        "👥 CADASTRAR FUNCIONÁRIOS:",
        "1. Clique em 👥 FUNCIONÁRIOS",
        "2. Clique em '+ Novo Funcionário'",
        "3. Preencha os dados (nome, email, salário, jornada, etc.)",
        "4. Clique em 'Salvar'",
        "5. Sistema gera senha temporária automaticamente",
        "",
        "🧪 TESTAR COMO FUNCIONÁRIO:",
        "1. Faça LOGOUT (clique 🚪 Sair)",
        "2. Faça login com: joao@example.com",
        "3. Você verá a tela de bater ponto",
      ],
      adminDashboard: {
        dashboard: "📊 Dashboard - KPIs do dia, presentes, ausentes",
        employees: "👥 Funcionários - cadastrar, editar, desativar",
        records: "📋 Registros - ver todos os pontos batidos",
        adjustments: "✏️ Ajustes - corrigir pontos com justificativa",
        reports: "📄 Relatórios - gerar PDF mensal com horas e pagamento",
        settings: "⚙️ Configurações - WiFi, GPS, localização, raio",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("\n❌ ERRO:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
