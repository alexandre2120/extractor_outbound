import { PrismaClient, Market, ProviderKind } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Workspace", slug: "demo" },
  });

  const profile = await prisma.businessProfile.create({
    data: {
      workspaceId: workspace.id,
      name: "Oferta demo",
      offer: "Plataforma de automação de outbound B2B",
      valueProp: "Mais reuniões qualificadas com menos esforço manual",
      tone: "Direto e consultivo",
      objective: "Gerar pipeline outbound em PMEs de serviços",
    },
  });

  const plan = await prisma.plan.create({
    data: {
      workspaceId: workspace.id,
      businessProfileId: profile.id,
      name: "Plano inicial — Brasil",
      objective: "Validar outbound para agências de marketing no Brasil",
      markets: { create: [{ market: Market.BRAZIL }] },
      countries: { create: [{ countryCode: "BR" }] },
      segments: {
        create: [
          { label: "Agências de marketing", keywords: "marketing,ads,growth" },
        ],
      },
      personas: {
        create: [{ role: "Head de Growth", seniority: "C-level/Head" }],
      },
    },
  });

  await prisma.leadList.create({
    data: {
      workspaceId: workspace.id,
      planId: plan.id,
      name: "Lista demo",
      description: "Lista gerada pelo seed para desenvolvimento",
    },
  });

  await prisma.providerSource.upsert({
    where: { kind_name: { kind: ProviderKind.CNPJ_REGISTRY, name: "cnpja" } },
    update: {},
    create: {
      kind: ProviderKind.CNPJ_REGISTRY,
      name: "cnpja",
      baseUrl: "https://api.cnpja.com",
    },
  });

  console.log("Seed concluído:", { workspace: workspace.slug, plan: plan.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
