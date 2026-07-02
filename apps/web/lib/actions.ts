"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CampaignStatus,
  DeliveryEventType,
  EnrichmentStatus,
  JobStatus,
  MessageStatus,
  prisma,
  ProviderKind,
  TemplateSettingsSource,
  TemplateSettingsStatus,
} from "@repo/db";
import {
  clientsFromEnv,
  extractTemplateSettings,
  generateColdMessage,
  researchBrandingWebsite,
} from "@repo/integrations";
import { buildCampaignSelectionHref } from "./campaign-selection";
import {
  renderOutboundEmailHtml,
  renderOutboundEmailText,
} from "./email-template";
import { getSelectedCompanyPrepIds } from "./selected-companies";
import {
  normalizeTemplateSettingsDraft,
  normalizeWebsiteUrl,
  shouldApplySuggestedOffer,
} from "./template-settings";
import { getWorkspace, getDefaultLeadList } from "./workspace";
import { researchQueue, enrichmentQueue, discoveryQueue } from "./queue";

export type ActionResult = { ok: boolean; message: string };

async function getPlanForTemplateSettings(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { businessProfile: true },
  });
  if (!plan) throw new Error("Plano não encontrado.");
  return plan;
}

// --- Onboarding / Plan -------------------------------------------------------

export async function createBusinessProfileAndPlan(
  formData: FormData,
): Promise<ActionResult> {
  const ws = await getWorkspace();
  const offer = String(formData.get("offer") ?? "").trim();
  const valueProp = String(formData.get("valueProp") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim() || null;
  const planName =
    String(formData.get("planName") ?? "").trim() || "Plano inicial";
  const country = ["BR", "PT"].includes(
    String(formData.get("country") ?? "").toUpperCase(),
  )
    ? String(formData.get("country")).toUpperCase()
    : "PT";
  const market = country === "BR" ? "BRAZIL" : "PORTUGAL";

  if (!offer || !valueProp || !objective) {
    return {
      ok: false,
      message: "Preencha oferta, proposta de valor e objetivo.",
    };
  }

  const profile = await prisma.businessProfile.create({
    data: {
      workspaceId: ws.id,
      name: offer.slice(0, 60),
      offer,
      valueProp,
      tone,
      objective,
    },
  });

  await prisma.plan.create({
    data: {
      workspaceId: ws.id,
      businessProfileId: profile.id,
      name: planName,
      objective,
      valueProp,
      tone,
      markets: { create: [{ market }] },
      countries: { create: [{ countryCode: country }] },
    },
  });

  revalidatePath("/plans");
  revalidatePath("/");
  return { ok: true, message: "Perfil e plano criados." };
}

// --- Ingestão por CNPJ -------------------------------------------------------

export async function ingestCompanyByCnpj(
  formData: FormData,
): Promise<ActionResult> {
  const taxId = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  if (taxId.length !== 14)
    return { ok: false, message: "CNPJ inválido (14 dígitos)." };

  const { cnpja } = clientsFromEnv();
  if (!cnpja)
    return { ok: false, message: "CNPJá não configurado (.env.local)." };

  const ws = await getWorkspace();
  try {
    const reg = await cnpja.lookup(taxId);
    const company = await prisma.company.upsert({
      where: { workspaceId_taxId: { workspaceId: ws.id, taxId } },
      update: {
        name: reg.name,
        legalName: reg.legalName,
        city: reg.city,
        state: reg.state,
        email: reg.email,
        phone: reg.phone,
      },
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
      update: {
        raw: reg.raw as object,
        cnae: reg.cnae,
        status: reg.status,
        provider: ProviderKind.CNPJ_REGISTRY,
      },
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
      where: {
        leadListId_companyId: { leadListId: list.id, companyId: company.id },
      },
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

export async function runResearchAction(
  companyId: string,
): Promise<ActionResult> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, message: "Empresa não encontrada." };

  const domain =
    company.domain || (company.email ? company.email.split("@")[1] : null);
  if (!domain)
    return {
      ok: false,
      message: "Sem domínio/site para pesquisar (preencha o domínio).",
    };

  // Cria o job (PENDING) e enfileira — o worker executa de forma assíncrona.
  const job = await prisma.companyResearchJob.create({
    data: { companyId, status: JobStatus.PENDING },
  });
  try {
    await researchQueue.add("research", { companyId, dbJobId: job.id });
  } catch (e) {
    await prisma.companyResearchJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        error: `Falha ao enfileirar: ${(e as Error).message}`,
      },
    });
    return {
      ok: false,
      message: "Não foi possível enfileirar (worker/Redis no ar?).",
    };
  }

  revalidatePath(`/companies/${companyId}`);
  return {
    ok: true,
    message: "Research enfileirado — o worker vai processar.",
  };
}

export async function setCompanyDomain(
  companyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const domain = String(formData.get("domain") ?? "").trim();
  await prisma.company.update({
    where: { id: companyId },
    data: { domain: domain || null },
  });
  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Domínio atualizado." };
}

// --- AI enrichment (manual) --------------------------------------------------

export async function enrichCompanyAction(
  companyId: string,
): Promise<ActionResult> {
  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado (.env.local)." };

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, message: "Empresa não encontrada." };

  // Cria o enrichment como DRAFT (na fila) e enfileira — worker preenche via KIE.
  const last = await prisma.aIEnrichment.findFirst({
    where: { companyId },
    orderBy: { version: "desc" },
  });
  const enrichment = await prisma.aIEnrichment.create({
    data: {
      companyId,
      status: EnrichmentStatus.DRAFT,
      version: (last?.version ?? 0) + 1,
      model: "kie",
    },
  });
  try {
    await enrichmentQueue.add("enrichment", {
      companyId,
      enrichmentId: enrichment.id,
    });
  } catch (e) {
    await prisma.aIEnrichment.update({
      where: { id: enrichment.id },
      data: {
        status: EnrichmentStatus.REJECTED,
        rawOutput: { error: `Falha ao enfileirar: ${(e as Error).message}` },
      },
    });
    return {
      ok: false,
      message: "Não foi possível enfileirar (worker/Redis no ar?).",
    };
  }

  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Enrichment enfileirado — o worker vai gerar." };
}

export async function approveEnrichmentAction(
  enrichmentId: string,
  companyId: string,
): Promise<ActionResult> {
  await prisma.aIEnrichment.update({
    where: { id: enrichmentId },
    data: {
      status: EnrichmentStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedBy: "local",
    },
  });
  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: "Enrichment aprovado." };
}

// --- Geração de mensagem -----------------------------------------------------

export async function generateMessageAction(
  companyId: string,
): Promise<ActionResult> {
  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado." };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      website: true,
      enrichments: {
        where: { status: EnrichmentStatus.APPROVED },
        orderBy: { version: "desc" },
        take: 1,
      },
      workspace: {
        include: { plans: { take: 1, orderBy: { createdAt: "desc" } } },
      },
    },
  });
  if (!company) return { ok: false, message: "Empresa não encontrada." };
  const enrichment = company.enrichments[0];
  if (!enrichment)
    return {
      ok: false,
      message: "Aprove um enrichment antes de gerar mensagem.",
    };

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

export async function sendMessageAction(
  messageId: string,
  companyId: string,
): Promise<ActionResult> {
  const { brevo } = clientsFromEnv();
  if (!brevo) return { ok: false, message: "Brevo não configurado." };

  const message = await prisma.generatedMessage.findUnique({
    where: { id: messageId },
    include: { company: true, campaign: true },
  });
  if (!message) return { ok: false, message: "Mensagem não encontrada." };
  const to = message.company.email;
  if (!to) return { ok: false, message: "Empresa sem e-mail de destino." };

  try {
    const subject = message.subject ?? "Olá";
    const text = renderOutboundEmailText(message.body);
    const html = renderOutboundEmailHtml({ subject, body: message.body });

    const res = await brevo.sendEmail({
      to: { email: to, name: message.company.name },
      subject,
      text,
      html,
    });
    await prisma.$transaction([
      prisma.generatedMessage.update({
        where: { id: messageId },
        data: { status: MessageStatus.SENT },
      }),
      prisma.deliveryEvent.create({
        data: {
          messageId,
          type: DeliveryEventType.SENT,
          provider: "brevo",
          providerId: res.messageId,
        },
      }),
    ]);
    revalidatePath(`/companies/${companyId}`);
    if (message.campaignId) revalidatePath(`/campaigns/${message.campaignId}`);
    return { ok: true, message: `Enviado via Brevo (${res.messageId}).` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// --- Plan editor -------------------------------------------------------------

export async function generateTemplateSettingsFromWebsiteAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado." };

  const plan = await getPlanForTemplateSettings(planId);
  const websiteUrl = normalizeWebsiteUrl(formData.get("websiteUrl"));
  if (!websiteUrl) {
    return { ok: false, message: "Informe um website https válido." };
  }

  try {
    const research = await researchBrandingWebsite(websiteUrl, { maxPages: 5 });
    const { result } = await extractTemplateSettings(kie, {
      websiteUrl,
      evidence: research.evidence,
      logoCandidates: research.logoCandidates,
      colorCandidates: research.colorCandidates,
    });
    const normalized = normalizeTemplateSettingsDraft({
      websiteUrl,
      brandName: result.brandName,
      logoUrl: result.logoUrl,
      primaryColor: result.primaryColor,
      accentColor: result.accentColor,
      backgroundColor: result.backgroundColor,
      fontFamily: result.fontFamily,
      senderName: result.senderName,
      senderRole: result.senderRole,
      signature: result.signature,
      ctaLabel: result.ctaLabel,
      ctaUrl: result.ctaUrl,
      offerSummary: result.offerSummary,
      valueProposition: result.valueProposition,
      tone: result.tone,
    });

    await prisma.emailTemplateSettings.create({
      data: {
        workspaceId: plan.workspaceId,
        businessProfileId: plan.businessProfileId,
        status: TemplateSettingsStatus.DRAFT,
        source: TemplateSettingsSource.WEBSITE_AGENT,
        isActive: false,
        ...normalized,
        rawExtraction: {
          result,
          pagesVisited: research.pagesVisited,
          evidenceRefs: result.evidenceRefs,
        },
      },
    });

    revalidatePath(`/plans/${planId}`);
    return { ok: true, message: "Branding gerado como rascunho." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function saveTemplateSettingsDraftAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const plan = await getPlanForTemplateSettings(planId);
    const settingsId = String(formData.get("settingsId") ?? "").trim();
    const normalized = normalizeTemplateSettingsDraft({
      websiteUrl: formData.get("websiteUrl"),
      brandName: formData.get("brandName"),
      logoUrl: formData.get("logoUrl"),
      primaryColor: formData.get("primaryColor"),
      accentColor: formData.get("accentColor"),
      backgroundColor: formData.get("backgroundColor"),
      fontFamily: formData.get("fontFamily"),
      senderName: formData.get("senderName"),
      senderRole: formData.get("senderRole"),
      signature: formData.get("signature"),
      ctaLabel: formData.get("ctaLabel"),
      ctaUrl: formData.get("ctaUrl"),
      offerSummary: formData.get("offerSummary"),
      valueProposition: formData.get("valueProposition"),
      tone: formData.get("tone"),
    });

    const applyOffer = formData.get("applyOffer") === "on";

    await prisma.$transaction(async (tx) => {
      if (settingsId) {
        const updated = await tx.emailTemplateSettings.updateMany({
          where: { id: settingsId, workspaceId: plan.workspaceId },
          data: {
            ...normalized,
            status: TemplateSettingsStatus.DRAFT,
            isActive: false,
          },
        });
        if (updated.count === 0) {
          throw new Error("Template não encontrado.");
        }
      } else {
        await tx.emailTemplateSettings.create({
          data: {
            workspaceId: plan.workspaceId,
            businessProfileId: plan.businessProfileId,
            status: TemplateSettingsStatus.DRAFT,
            source: TemplateSettingsSource.MANUAL,
            isActive: false,
            ...normalized,
          },
        });
      }

      if (
        plan.businessProfileId &&
        normalized.offerSummary &&
        shouldApplySuggestedOffer(plan.businessProfile?.offer, applyOffer)
      ) {
        await tx.businessProfile.update({
          where: { id: plan.businessProfileId },
          data: { offer: normalized.offerSummary },
        });
      }
    });

    revalidatePath(`/plans/${planId}`);
    return { ok: true, message: "Template salvo como rascunho." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function approveTemplateSettingsAction(
  planId: string,
  settingsId: string,
): Promise<ActionResult> {
  try {
    const plan = await getPlanForTemplateSettings(planId);
    const settings = await prisma.emailTemplateSettings.findFirst({
      where: { id: settingsId, workspaceId: plan.workspaceId },
    });
    if (!settings) return { ok: false, message: "Template não encontrado." };

    await prisma.$transaction([
      prisma.emailTemplateSettings.updateMany({
        where: { workspaceId: plan.workspaceId },
        data: { isActive: false },
      }),
      prisma.emailTemplateSettings.update({
        where: { id: settingsId },
        data: {
          status: TemplateSettingsStatus.APPROVED,
          isActive: true,
          approvedAt: new Date(),
        },
      }),
    ]);

    revalidatePath(`/plans/${planId}`);
    revalidatePath("/companies");
    revalidatePath("/campaigns");
    return { ok: true, message: "Template aprovado para próximos envios." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function updatePlanAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const valueProp = String(formData.get("valueProp") ?? "").trim() || null;
  const tone = String(formData.get("tone") ?? "").trim() || null;
  if (!name || !objective)
    return { ok: false, message: "Nome e objetivo são obrigatórios." };

  await prisma.plan.update({
    where: { id: planId },
    data: { name, objective, valueProp, tone },
  });
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
  return { ok: true, message: "Plano atualizado." };
}

export async function addSegmentAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { ok: false, message: "Informe o segmento." };
  await prisma.planSegment.create({
    data: {
      planId,
      label,
      keywords: String(formData.get("keywords") ?? "").trim() || null,
      cnaeCodes: String(formData.get("cnaeCodes") ?? "").trim() || null,
    },
  });
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Segmento adicionado." };
}

export async function addPersonaAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const role = String(formData.get("role") ?? "").trim();
  if (!role) return { ok: false, message: "Informe o cargo/persona." };
  await prisma.planPersona.create({
    data: {
      planId,
      role,
      seniority: String(formData.get("seniority") ?? "").trim() || null,
      painPoints: String(formData.get("painPoints") ?? "").trim() || null,
    },
  });
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Persona adicionada." };
}

export async function addConstraintAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const type = String(formData.get("type") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!type || !value)
    return { ok: false, message: "Informe tipo e valor da restrição." };
  await prisma.planConstraint.create({ data: { planId, type, value } });
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Restrição adicionada." };
}

export async function removeSegmentAction(
  id: string,
  planId: string,
): Promise<ActionResult> {
  await prisma.planSegment.delete({ where: { id } });
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Segmento removido." };
}

export async function removePersonaAction(
  id: string,
  planId: string,
): Promise<ActionResult> {
  await prisma.planPersona.delete({ where: { id } });
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Persona removida." };
}

export async function removeConstraintAction(
  id: string,
  planId: string,
): Promise<ActionResult> {
  await prisma.planConstraint.delete({ where: { id } });
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Restrição removida." };
}

// --- Campaigns / sequences ---------------------------------------------------

export async function createCampaignAction(
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Informe o nome da campanha." };
  const selectedCompanyIds = Array.from(
    new Set(
      formData
        .getAll("companyId")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
  const selectedPlanId = String(formData.get("planId") ?? "").trim();
  const ws = await getWorkspace();
  const plan = selectedPlanId
    ? await prisma.plan.findFirst({
        where: { id: selectedPlanId, workspaceId: ws.id },
      })
    : await prisma.plan.findFirst({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: "desc" },
      });
  const campaign = await prisma.outboundCampaign.create({
    data: {
      workspaceId: ws.id,
      planId: plan?.id ?? null,
      name,
      channel: "email",
    },
  });
  revalidatePath("/campaigns");
  if (selectedCompanyIds.length > 0) {
    redirect(
      buildCampaignSelectionHref(
        `/campaigns/${campaign.id}`,
        selectedCompanyIds,
        plan?.id ?? selectedPlanId,
      ),
    );
  }
  return { ok: true, message: "Campanha criada." };
}

export async function addStepAction(
  campaignId: string,
  formData: FormData,
): Promise<ActionResult> {
  const template = String(formData.get("template") ?? "").trim();
  const delayDays = Number(formData.get("delayDays") ?? 0) || 0;
  if (!template) return { ok: false, message: "Descreva o objetivo do passo." };
  const count = await prisma.sequenceStep.count({ where: { campaignId } });
  await prisma.sequenceStep.create({
    data: {
      campaignId,
      order: count + 1,
      channel: "email",
      delayDays,
      template,
    },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: "Passo adicionado." };
}

export async function removeStepAction(
  stepId: string,
  campaignId: string,
): Promise<ActionResult> {
  await prisma.sequenceStep.delete({ where: { id: stepId } });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: "Passo removido." };
}

export async function setCampaignStatusAction(
  campaignId: string,
  status: CampaignStatus,
): Promise<ActionResult> {
  await prisma.outboundCampaign.update({
    where: { id: campaignId },
    data: { status },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: `Campanha ${status}.` };
}

/** Avança empresas selecionadas até o próximo estado necessário para campanha. */
export async function prepareSelectedCompaniesAction(
  campaignId: string,
  formData: FormData,
): Promise<ActionResult> {
  const companyIds = Array.from(
    new Set(
      formData
        .getAll("companyId")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
  if (companyIds.length === 0)
    return { ok: false, message: "Selecione empresas para preparar." };

  const campaign = await prisma.outboundCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, workspaceId: true },
  });
  if (!campaign) return { ok: false, message: "Campanha não encontrada." };

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds }, workspaceId: campaign.workspaceId },
    include: {
      website: true,
      researchJobs: { orderBy: { createdAt: "desc" }, take: 3 },
      enrichments: { orderBy: { version: "desc" }, take: 3 },
    },
  });
  if (companies.length === 0)
    return { ok: false, message: "Empresas não encontradas." };

  const prepIds = getSelectedCompanyPrepIds(
    companies.map((company) => ({
      id: company.id,
      name: company.name,
      domain: company.domain,
      email: company.email,
      websiteSummary: company.website?.factualSummary ?? null,
      researchStatuses: company.researchJobs.map((job) => job.status),
      enrichmentStatuses: company.enrichments.map(
        (enrichment) => enrichment.status,
      ),
    })),
  );
  const approveIds = new Set(prepIds.approveIds);
  const enrichIds = new Set(prepIds.enrichIds);
  const researchIds = new Set(prepIds.researchIds);
  const { kie } = clientsFromEnv();

  let approved = 0;
  let enrichmentQueued = 0;
  let researchQueued = 0;
  let skipped = 0;

  for (const company of companies) {
    if (approveIds.has(company.id)) {
      const enrichment = company.enrichments.find(
        (item) =>
          item.status === EnrichmentStatus.GENERATED ||
          item.status === EnrichmentStatus.REVIEWED,
      );
      if (!enrichment) {
        skipped++;
        continue;
      }

      await prisma.aIEnrichment.update({
        where: { id: enrichment.id },
        data: {
          status: EnrichmentStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: "local",
        },
      });
      approved++;
      continue;
    }

    if (enrichIds.has(company.id)) {
      if (!kie) {
        skipped++;
        continue;
      }

      const last = company.enrichments[0];
      const enrichment = await prisma.aIEnrichment.create({
        data: {
          companyId: company.id,
          status: EnrichmentStatus.DRAFT,
          version: (last?.version ?? 0) + 1,
          model: "kie",
        },
      });

      try {
        await enrichmentQueue.add("enrichment", {
          companyId: company.id,
          enrichmentId: enrichment.id,
        });
        enrichmentQueued++;
      } catch (e) {
        await prisma.aIEnrichment.update({
          where: { id: enrichment.id },
          data: {
            status: EnrichmentStatus.REJECTED,
            rawOutput: {
              error: `Falha ao enfileirar: ${(e as Error).message}`,
            },
          },
        });
        skipped++;
      }
      continue;
    }

    if (researchIds.has(company.id)) {
      const job = await prisma.companyResearchJob.create({
        data: { companyId: company.id, status: JobStatus.PENDING },
      });

      try {
        await researchQueue.add("research", {
          companyId: company.id,
          dbJobId: job.id,
        });
        researchQueued++;
      } catch (e) {
        await prisma.companyResearchJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            error: `Falha ao enfileirar: ${(e as Error).message}`,
          },
        });
        skipped++;
      }
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  const parts = [
    approved ? `${approved} aprovada(s)` : null,
    enrichmentQueued ? `${enrichmentQueued} enrichment` : null,
    researchQueued ? `${researchQueued} research` : null,
    skipped ? `${skipped} sem ação agora` : null,
  ].filter(Boolean);

  return {
    ok: approved + enrichmentQueued + researchQueued > 0,
    message: parts.length
      ? `Preparação iniciada: ${parts.join(" · ")}.`
      : "Nenhuma empresa selecionada tinha próxima ação disponível.",
  };
}

/** Gera uma mensagem por passo da sequência para uma ou mais empresas (KIE). */
export async function generateSequenceForCompanyAction(
  campaignId: string,
  formData: FormData,
): Promise<ActionResult> {
  const companyIds = Array.from(
    new Set(
      formData
        .getAll("companyId")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
  if (companyIds.length === 0)
    return { ok: false, message: "Escolha ao menos uma empresa." };

  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado." };

  const campaign = await prisma.outboundCampaign.findUnique({
    where: { id: campaignId },
    include: { steps: { orderBy: { order: "asc" } }, plan: true },
  });
  if (!campaign) return { ok: false, message: "Campanha não encontrada." };
  if (campaign.steps.length === 0)
    return { ok: false, message: "Adicione passos à sequência antes." };

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds }, workspaceId: campaign.workspaceId },
    include: {
      website: true,
      enrichments: {
        where: { status: EnrichmentStatus.APPROVED },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });
  if (companies.length === 0)
    return { ok: false, message: "Empresa não encontrada." };

  try {
    let created = 0;
    let skipped = 0;
    for (const company of companies) {
      const enrichment = company.enrichments[0];
      if (!enrichment) {
        skipped++;
        continue;
      }

      for (const step of campaign.steps) {
        const { result } = await generateColdMessage(kie, {
          planObjective:
            campaign.plan?.objective ?? "Gerar pipeline outbound B2B",
          valueProp: campaign.plan?.valueProp ?? "",
          tone: campaign.plan?.tone ?? "direto e consultivo",
          companyName: company.name,
          approachAngle: `${enrichment.approachAngle ?? ""} | Passo ${step.order} (dia ${step.delayDays}): ${step.template}`,
          factualSummary: company.website?.factualSummary ?? "",
        });
        await prisma.generatedMessage.create({
          data: {
            campaignId,
            stepId: step.id,
            companyId: company.id,
            enrichmentId: enrichment.id,
            channel: "email",
            subject: result.subject,
            body: result.body,
            status: MessageStatus.DRAFT,
          },
        });
        created++;
      }
    }
    revalidatePath(`/campaigns/${campaignId}`);
    return {
      ok: created > 0,
      message:
        created > 0
          ? `Sequência gerada: ${created} mensagem(ns)${skipped ? ` · ${skipped} empresa(s) sem enrichment aprovado.` : "."}`
          : "Aprove um enrichment das empresas selecionadas antes.",
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// --- Discovery (motor de descoberta a partir do plano) -----------------------

const MARKET_BY_COUNTRY: Record<string, "BRAZIL" | "PORTUGAL" | "EUROPE"> = {
  BR: "BRAZIL",
  PT: "PORTUGAL",
};

/** Define país/mercado do plano (corrige o país; habilita Portugal). */
export async function setPlanLocationAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const country = String(formData.get("country") ?? "")
    .trim()
    .toUpperCase();
  if (!["BR", "PT"].includes(country))
    return { ok: false, message: "País inválido." };
  const market = MARKET_BY_COUNTRY[country]!;

  await prisma.$transaction([
    prisma.planCountry.deleteMany({ where: { planId } }),
    prisma.planMarket.deleteMany({ where: { planId } }),
    prisma.planCountry.create({ data: { planId, countryCode: country } }),
    prisma.planMarket.create({ data: { planId, market } }),
  ]);
  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: `País do plano: ${country}.` };
}

/** Enfileira uma rodada de descoberta para o plano. */
export async function runDiscoveryAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const requested = Math.min(
    30,
    Math.max(5, Number(formData.get("requested") ?? 12) || 12),
  );
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { segments: true, countries: true },
  });
  if (!plan) return { ok: false, message: "Plano não encontrado." };
  if (plan.segments.length === 0)
    return { ok: false, message: "Adicione ao menos um segmento ao plano." };
  if (plan.countries.length === 0)
    return { ok: false, message: "Defina o país do plano antes." };

  const run = await prisma.discoveryRun.create({
    data: { planId, workspaceId: plan.workspaceId, requested },
  });
  try {
    await discoveryQueue.add("discovery", { runId: run.id, planId });
  } catch (e) {
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: `Falha ao enfileirar: ${(e as Error).message}`,
      },
    });
    return {
      ok: false,
      message: "Não foi possível enfileirar (worker/Redis no ar?).",
    };
  }
  revalidatePath(`/plans/${planId}`);
  return {
    ok: true,
    message: `Descoberta enfileirada (${requested} empresas) — o worker vai processar.`,
  };
}

/** Enfileira refino em lote para empresas selecionadas no ranking do plano. */
export async function refineCompaniesAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const companyIds = Array.from(
    new Set(
      formData
        .getAll("companyId")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  );
  if (companyIds.length === 0) {
    return {
      ok: false,
      message: "Selecione ao menos uma empresa para refinar.",
    };
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { workspaceId: true },
  });
  if (!plan) return { ok: false, message: "Plano não encontrado." };

  const { kie } = clientsFromEnv();
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds }, workspaceId: plan.workspaceId },
    include: {
      website: true,
      researchJobs: { orderBy: { createdAt: "desc" }, take: 3 },
      enrichments: { orderBy: { version: "desc" }, take: 3 },
    },
  });

  let researchQueued = 0;
  let enrichmentQueued = 0;
  let skipped = 0;
  const usableEnrichmentStatuses: EnrichmentStatus[] = [
    EnrichmentStatus.GENERATED,
    EnrichmentStatus.REVIEWED,
    EnrichmentStatus.APPROVED,
  ];

  for (const company of companies) {
    const domain =
      company.domain || (company.email ? company.email.split("@")[1] : null);
    const hasWebsite = !!company.website?.factualSummary;
    const hasActiveResearch = company.researchJobs.some(
      (job) =>
        job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING,
    );
    const hasActiveEnrichment = company.enrichments.some(
      (enrichment) => enrichment.status === EnrichmentStatus.DRAFT,
    );
    const hasUsableEnrichment = company.enrichments.some((enrichment) =>
      usableEnrichmentStatuses.includes(enrichment.status),
    );

    if (!hasWebsite) {
      if (!domain || hasActiveResearch) {
        skipped++;
        continue;
      }

      const job = await prisma.companyResearchJob.create({
        data: { companyId: company.id, status: JobStatus.PENDING },
      });

      try {
        await researchQueue.add("research", {
          companyId: company.id,
          dbJobId: job.id,
        });
        researchQueued++;
      } catch (e) {
        await prisma.companyResearchJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            error: `Falha ao enfileirar: ${(e as Error).message}`,
          },
        });
        skipped++;
      }
      continue;
    }

    if (!kie || hasActiveEnrichment || hasUsableEnrichment) {
      skipped++;
      continue;
    }

    const last = company.enrichments[0];
    const enrichment = await prisma.aIEnrichment.create({
      data: {
        companyId: company.id,
        status: EnrichmentStatus.DRAFT,
        version: (last?.version ?? 0) + 1,
        model: "kie",
      },
    });

    try {
      await enrichmentQueue.add("enrichment", {
        companyId: company.id,
        enrichmentId: enrichment.id,
      });
      enrichmentQueued++;
    } catch (e) {
      await prisma.aIEnrichment.update({
        where: { id: enrichment.id },
        data: {
          status: EnrichmentStatus.REJECTED,
          rawOutput: { error: `Falha ao enfileirar: ${(e as Error).message}` },
        },
      });
      skipped++;
    }
  }

  revalidatePath(`/plans/${planId}`);
  revalidatePath("/companies");

  const parts = [
    researchQueued ? `${researchQueued} research` : null,
    enrichmentQueued ? `${enrichmentQueued} enrichment` : null,
    skipped ? `${skipped} sem ação agora` : null,
  ].filter(Boolean);

  return {
    ok: researchQueued + enrichmentQueued > 0,
    message: parts.length
      ? `Refino enfileirado: ${parts.join(" · ")}.`
      : "Nada novo para enfileirar.",
  };
}
