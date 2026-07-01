"use server";

import { revalidatePath } from "next/cache";
import { prisma, ProviderKind, JobStatus, EnrichmentStatus, MessageStatus, DeliveryEventType } from "@repo/db";
import { clientsFromEnv, generateColdMessage } from "@repo/integrations";
import { getWorkspace, getDefaultLeadList } from "./workspace";
import { researchQueue, enrichmentQueue } from "./queue";

type ActionResult = { ok: boolean; message: string };

// --- Onboarding / Plan -------------------------------------------------------

export async function createBusinessProfileAndPlan(
  formData: FormData,
): Promise<ActionResult> {
  const ws = await getWorkspace();
  const offer = String(formData.get("offer") ?? "").trim();
  const valueProp = String(formData.get("valueProp") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim() || null;
  const planName = String(formData.get("planName") ?? "").trim() || "Plano inicial";

  if (!offer || !valueProp || !objective) {
    return { ok: false, message: "Preencha oferta, proposta de valor e objetivo." };
  }

  const profile = await prisma.businessProfile.create({
    data: { workspaceId: ws.id, name: offer.slice(0, 60), offer, valueProp, tone, objective },
  });

  await prisma.plan.create({
    data: {
      workspaceId: ws.id,
      businessProfileId: profile.id,
      name: planName,
      objective,
      valueProp,
      tone,
      markets: { create: [{ market: "BRAZIL" }] },
      countries: { create: [{ countryCode: "BR" }] },
    },
  });

  revalidatePath("/plans");
  revalidatePath("/");
  return { ok: true, message: "Perfil e plano criados." };
}

// --- Ingestão por CNPJ -------------------------------------------------------

export async function ingestCompanyByCnpj(formData: FormData): Promise<ActionResult> {
  const taxId = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  if (taxId.length !== 14) return { ok: false, message: "CNPJ inválido (14 dígitos)." };

  const { cnpja } = clientsFromEnv();
  if (!cnpja) return { ok: false, message: "CNPJá não configurado (.env.local)." };

  const ws = await getWorkspace();
  try {
    const reg = await cnpja.lookup(taxId);
    const company = await prisma.company.upsert({
      where: { workspaceId_taxId: { workspaceId: ws.id, taxId } },
      update: { name: reg.name, legalName: reg.legalName, city: reg.city, state: reg.state, email: reg.email, phone: reg.phone },
      create: {
        workspaceId: ws.id,
        name: reg.name,
        legalName: reg.legalName,
        taxId,
        countryCode: "BR",
        email: reg.email,
        phone: reg.phone,
        city: reg.city,
        state: reg.state,
        source: ProviderKind.CNPJ_REGISTRY,
      },
    });

    await prisma.companyRegistryData.upsert({
      where: { companyId: company.id },
      update: { raw: reg.raw as object, cnae: reg.cnae, status: reg.status, provider: ProviderKind.CNPJ_REGISTRY },
      create: {
        companyId: company.id,
        provider: ProviderKind.CNPJ_REGISTRY,
        raw: reg.raw as object,
        cnae: reg.cnae,
        status: reg.status,
        foundedAt: reg.foundedAt ? new Date(reg.foundedAt) : null,
      },
    });

    const list = await getDefaultLeadList(ws.id);
    await prisma.leadListMember.upsert({
      where: { leadListId_companyId: { leadListId: list.id, companyId: company.id } },
      update: {},
      create: { leadListId: list.id, companyId: company.id },
    });

    revalidatePath("/companies");
    return { ok: true, message: `Empresa "${reg.name}" ingerida.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// --- Browser research --------------------------------------------------------

export async function runResearchAction(companyId: string): Promise<ActionResult> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, message: "Empresa não encontrada." };

  const domain = company.domain || (company.email ? company.email.split("@")[1] : null);
  if (!domain) return { ok: false, message: "Sem domínio/site para pesquisar (preencha o domínio)." };

  // Cria o job (PENDING) e enfileira — o worker executa de forma assíncrona.
  const job = await prisma.companyResearchJob.create({
    data: { companyId, status: JobStatus.PENDING },
  });
  try {
    await researchQueue.add("research", { companyId, dbJobId: job.id });
  } catch (e) {
    await prisma.companyResearchJob.update({
      where: { id: job.id },
      data: { status: JobStatus.FAILED, error: `Falha ao enfileirar: ${(e as Error).message}` },
    });
    return { ok: false, message: "Não foi possível enfileirar (worker/Redis no ar?)." };
  }

  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Research enfileirado — o worker vai processar." };
}

export async function setCompanyDomain(companyId: string, formData: FormData): Promise<ActionResult> {
  const domain = String(formData.get("domain") ?? "").trim();
  await prisma.company.update({ where: { id: companyId }, data: { domain: domain || null } });
  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Domínio atualizado." };
}

// --- AI enrichment (manual) --------------------------------------------------

export async function enrichCompanyAction(companyId: string): Promise<ActionResult> {
  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado (.env.local)." };

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, message: "Empresa não encontrada." };

  // Cria o enrichment como DRAFT (na fila) e enfileira — worker preenche via KIE.
  const last = await prisma.aIEnrichment.findFirst({ where: { companyId }, orderBy: { version: "desc" } });
  const enrichment = await prisma.aIEnrichment.create({
    data: { companyId, status: EnrichmentStatus.DRAFT, version: (last?.version ?? 0) + 1, model: "kie" },
  });
  try {
    await enrichmentQueue.add("enrichment", { companyId, enrichmentId: enrichment.id });
  } catch (e) {
    await prisma.aIEnrichment.update({
      where: { id: enrichment.id },
      data: { status: EnrichmentStatus.REJECTED, rawOutput: { error: `Falha ao enfileirar: ${(e as Error).message}` } },
    });
    return { ok: false, message: "Não foi possível enfileirar (worker/Redis no ar?)." };
  }

  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Enrichment enfileirado — o worker vai gerar." };
}

export async function approveEnrichmentAction(enrichmentId: string, companyId: string): Promise<ActionResult> {
  await prisma.aIEnrichment.update({
    where: { id: enrichmentId },
    data: { status: EnrichmentStatus.APPROVED, reviewedAt: new Date(), reviewedBy: "local" },
  });
  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Enrichment aprovado." };
}

// --- Geração de mensagem -----------------------------------------------------

export async function generateMessageAction(companyId: string): Promise<ActionResult> {
  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado." };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      website: true,
      enrichments: { where: { status: EnrichmentStatus.APPROVED }, orderBy: { version: "desc" }, take: 1 },
      workspace: { include: { plans: { take: 1, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!company) return { ok: false, message: "Empresa não encontrada." };
  const enrichment = company.enrichments[0];
  if (!enrichment) return { ok: false, message: "Aprove um enrichment antes de gerar mensagem." };

  const plan = company.workspace.plans[0];
  try {
    const { result } = await generateColdMessage(kie, {
      planObjective: plan?.objective ?? "Gerar pipeline outbound B2B",
      valueProp: plan?.valueProp ?? "",
      tone: plan?.tone ?? "direto e consultivo",
      companyName: company.name,
      approachAngle: enrichment.approachAngle ?? "",
      factualSummary: company.website?.factualSummary ?? "",
    });

    await prisma.generatedMessage.create({
      data: {
        companyId,
        enrichmentId: enrichment.id,
        channel: "email",
        subject: result.subject,
        body: result.body,
        status: MessageStatus.DRAFT,
      },
    });
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, message: "Mensagem gerada (rascunho)." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// --- Envio via Brevo ---------------------------------------------------------

export async function sendMessageAction(messageId: string, companyId: string): Promise<ActionResult> {
  const { brevo } = clientsFromEnv();
  if (!brevo) return { ok: false, message: "Brevo não configurado." };

  const message = await prisma.generatedMessage.findUnique({
    where: { id: messageId },
    include: { company: true },
  });
  if (!message) return { ok: false, message: "Mensagem não encontrada." };
  const to = message.company.email;
  if (!to) return { ok: false, message: "Empresa sem e-mail de destino." };

  try {
    const res = await brevo.sendEmail({
      to: { email: to, name: message.company.name },
      subject: message.subject ?? "Olá",
      text: message.body,
    });
    await prisma.$transaction([
      prisma.generatedMessage.update({ where: { id: messageId }, data: { status: MessageStatus.SENT } }),
      prisma.deliveryEvent.create({
        data: { messageId, type: DeliveryEventType.SENT, provider: "brevo", providerId: res.messageId },
      }),
    ]);
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, message: `Enviado via Brevo (${res.messageId}).` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
