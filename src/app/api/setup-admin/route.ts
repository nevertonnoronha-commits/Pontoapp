import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const adminEmail = "camaleao.presente@gmail.com";
  const supabase = await createServiceClient();

  console.log("🚀 Iniciando setup do admin...\n");

  try {
    // 1. Encontrar o admin
    console.log(`1️⃣ Procurando admin: ${adminEmail}`);
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("id, organization_id, email, name, role")
      .eq("email", adminEmail)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: `❌ Admin não encontrado! Faça login primeiro em /login com ${adminEmail}` },
        { status: 404 }
      );
    }

    console.log(`✅ Admin encontrado: ${adminUser.name} (${adminUser.email})`);
    console.log(`   Organization ID: ${adminUser.organization_id}`);
    console.log(`   User ID: ${adminUser.id}\n`);

    // 2. Criar/atualizar store_configs
    console.log("2️⃣ Configurando loja...");
    const { data: existingConfig } = await supabase
      .from("store_configs")
      .select("id")
      .eq("organization_id", adminUser.organization_id)
      .single();

    let storeConfig;
    if (existingConfig) {
      console.log("   Store config já existe, atualizando...");
      const { data, error } = await supabase
        .from("store_configs")
        .update({
          store_name: "Minha Loja",
          wifi_ssid: "WiFi-Loja",
          gps_latitude: -23.5505,
          gps_longitude: -46.6333,
          gps_radius_meters: 200,
          updated_by: adminUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", adminUser.organization_id)
        .select()
        .single();

      if (error) throw error;
      storeConfig = data;
    } else {
      console.log("   Criando novo store config...");
      const { data, error } = await supabase
        .from("store_configs")
        .insert({
          organization_id: adminUser.organization_id,
          store_name: "Minha Loja",
          wifi_ssid: "WiFi-Loja",
          gps_latitude: -23.5505,
          gps_longitude: -46.6333,
          gps_radius_meters: 200,
          updated_by: adminUser.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      storeConfig = data;
    }

    console.log("✅ Loja configurada!");
    console.log(`   Nome: ${storeConfig.store_name}`);
    console.log(`   WiFi: ${storeConfig.wifi_ssid}`);
    console.log(`   Localização: ${storeConfig.gps_latitude}, ${storeConfig.gps_longitude}`);
    console.log(`   Raio: ${storeConfig.gps_radius_meters}m\n`);

    // 3. Criar usuário de teste
    console.log("3️⃣ Criando funcionário de teste...");

    const testEmail = "joao@example.com";
    const testPassword = "Teste@123456";

    // Verificar se já existe
    const { data: existingEmployee } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", testEmail)
      .single();

    let testEmployee;
    if (existingEmployee) {
      console.log("   Funcionário de teste já existe");
      testEmployee = existingEmployee;
    } else {
      // Criar auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Erro ao criar auth user: ${authError.message}`);
      }

      // Criar user no banco
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          organization_id: adminUser.organization_id,
          name: "João Teste",
          email: testEmail,
          role: "employee",
          is_active: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Criar perfil de funcionário
      const { error: profileError } = await supabase
        .from("employee_profiles")
        .insert({
          user_id: authData.user.id,
          organization_id: adminUser.organization_id,
          job_title: "Vendedor",
          salary: 2500,
          daily_hours: 8,
          monthly_hours: 220,
          compensation_type: "payment",
          lunch_break_minutes: 60,
          admission_date: new Date().toISOString().split("T")[0],
        });

      if (profileError) throw profileError;

      testEmployee = userData;
      console.log("✅ Funcionário de teste criado!");
      console.log(`   Nome: João Teste`);
      console.log(`   Email: ${testEmail}`);
      console.log(`   Cargo: Vendedor`);
      console.log(`   Salário: R$ 2.500,00`);
      console.log(`   Jornada: 8h/dia (220h/mês)\n`);
    }

    // Resposta com instruções
    const response = {
      success: true,
      message: "✨ SETUP COMPLETO!",
      admin: {
        email: adminUser.email,
        name: adminUser.name,
        organizationId: adminUser.organization_id,
      },
      storeConfig: {
        name: storeConfig.store_name,
        wifi: storeConfig.wifi_ssid,
        latitude: storeConfig.gps_latitude,
        longitude: storeConfig.gps_longitude,
        radius: `${storeConfig.gps_radius_meters}m`,
      },
      testEmployee: {
        email: testEmail,
        password: testPassword,
        name: "João Teste",
      },
      nextSteps: [
        "1. Faça logout do admin (se estiver logado)",
        "2. Acesse /login",
        "3. Use: camaleao.presente@gmail.com + sua senha",
        "4. Você será redirecionado para /dashboard (admin)",
        "5. Vá em ⚙️ CONFIGURAÇÕES e clique 'Usar minha localização atual'",
        "6. Clique em 'Salvar Configurações'",
        "7. Vá em 👥 FUNCIONÁRIOS e cadastre novos funcionários",
        "8. Para testar como funcionário, faça logout e use: joao@example.com + Teste@123456",
      ],
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
