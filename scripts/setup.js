#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Variáveis de ambiente não configuradas!");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅" : "❌");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "✅" : "❌");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setup() {
  console.log("🚀 Setup do PontoApp\n");
  console.log("=".repeat(60));

  try {
    // 1. Criar organização
    console.log("\n1️⃣  Criando organização...");
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: "Minha Loja",
        plan: "free",
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log(`✅ Organização criada: ${org.id}`);

    // 2. Criar admin
    console.log("\n2️⃣  Criando usuário admin...");
    const adminEmail = "camaleao.presente@gmail.com";
    const adminPassword = "Ponto@Admin123";

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("User already registered")) {
        console.log("⚠️  Admin já existe");
        // Pegar o ID do usuário existente
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        const admin = allUsers.users.find(u => u.email === adminEmail);
        authData.user = admin;
      } else {
        throw authError;
      }
    }
    console.log(`✅ Admin criado: ${authData.user.id}`);

    // 3. Criar user no banco
    console.log("\n3️⃣  Registrando admin no banco...");
    await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        organization_id: org.id,
        name: "Admin",
        email: adminEmail,
        role: "admin",
        is_active: true,
      })
      .then(res => {
        if (res.error && !res.error.message.includes("duplicate")) throw res.error;
      });
    console.log("✅ Admin registrado");

    // 4. Criar store_configs
    console.log("\n4️⃣  Configurando loja...");
    await supabase
      .from("store_configs")
      .insert({
        organization_id: org.id,
        store_name: "Minha Loja",
        wifi_ssid: "WiFi-Padrão",
        gps_latitude: -23.5505,
        gps_longitude: -46.6333,
        gps_radius_meters: 200,
        updated_by: authData.user.id,
      });
    console.log("✅ Loja configurada");

    // 5. Criar funcionário de teste
    console.log("\n5️⃣  Criando funcionário de teste...");
    const testEmail = "joao@example.com";
    const testPassword = "Teste@123456";

    const { data: testAuthData, error: testAuthError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!testAuthError) {
      await supabase
        .from("users")
        .insert({
          id: testAuthData.user.id,
          organization_id: org.id,
          name: "João Teste",
          email: testEmail,
          role: "employee",
          is_active: true,
        });

      await supabase
        .from("employee_profiles")
        .insert({
          user_id: testAuthData.user.id,
          organization_id: org.id,
          job_title: "Vendedor",
          salary: 2500,
          daily_hours: 8,
          monthly_hours: 220,
          compensation_type: "payment",
          lunch_break_minutes: 60,
          admission_date: new Date().toISOString().split("T")[0],
        });

      console.log("✅ Funcionário de teste criado");
    }

    // Relatório final
    console.log("\n" + "=".repeat(60));
    console.log("\n✨ SETUP CONCLUÍDO COM SUCESSO!\n");
    console.log("📋 CREDENCIAIS:\n");
    console.log(`   ADMIN:`);
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔐 Senha: ${adminPassword}\n`);
    console.log(`   FUNCIONÁRIO (teste):`);
    console.log(`   📧 Email: ${testEmail}`);
    console.log(`   🔐 Senha: ${testPassword}\n`);

    console.log("🎯 PRÓXIMOS PASSOS:\n");
    console.log("   1️⃣  Inicie o app: npm run dev");
    console.log("   2️⃣  Acesse: http://localhost:3000");
    console.log("   3️⃣  Faça login com as credenciais de ADMIN");
    console.log("   4️⃣  Vá em ⚙️ CONFIGURAÇÕES");
    console.log("   5️⃣  Clique 'Usar minha localização atual'");
    console.log("   6️⃣  Clique 'Salvar Configurações'");
    console.log("   7️⃣  Pronto! Admin está configurado\n");

    console.log("🧪 PARA TESTAR:\n");
    console.log("   1. Faça logout (🚪 Sair)");
    console.log("   2. Faça login com funcionário de teste");
    console.log("   3. Você verá a tela de bater ponto\n");

    console.log("=" + "=".repeat(59));

  } catch (error) {
    console.error("\n❌ ERRO:", error.message);
    process.exit(1);
  }
}

setup();
