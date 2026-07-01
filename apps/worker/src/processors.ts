import {
  prisma,
  JobStatus,
  EnrichmentStatus,
  DiscoveryStatus,
  ProviderKind,
} from "@repo/db";
import {
  clientsFromEnv,
  enrichCompany,
  researchCompany,
  runDiscovery,
  buildDiscoveryQuery,
  rankCompany,
} from "@repo/integrations";

export interface ResearchJobData {
  companyId: string;
  dbJobId: string;
}

export interface EnrichmentJobData {
  companyId: string;
  enrichmentId: string;
}

/** Browser research → evidências, snapshot, website summary. */
export async function processResearch(data: ResearchJobData): Promise<void> {
  const { companyId, dbJobId } = data;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Empresa não encontrada");

  const domain = company.domain || (company.email ? company.email.split("@")[1] : null);
  if (!domain) {
    await prisma.companyResearchJob.update({
      where: { id: dbJobId },
      data: { status: JobStatus.FAILED, error: "Sem domínio para pesquisar", finishedAt: new Date() },
    });
    return;
  }

  await prisma.companyResearchJob.update({
    where: { id: dbJobId },
    data: { status: JobStatus.RUNNING, startedAt: new Date() },
  });

  try {
    const out = await researchCompany(domain, { maxPages: 6 });
    await prisma.$transaction([
      prisma.researchEvidence.createMany({
        data: out.evidence.map((e) => ({
          researchJobId: dbJobId,
          url: e.url,
          pageType: e.pageType,
          extracted: e.extracted,
        })),
      }),
      prisma.researchSnapshot.create({
        data: { researchJobId: dbJobId, url: domain, content: out.factualSummary },
      }),
      prisma.companyResearchJob.update({
        where: { id: dbJobId },
        data: { status: JobStatus.DONE, qualityScore: out.qualityScore, finishedAt: new Date() },
      }),
      prisma.companyWebsite.upsert({
        where: { companyId },
        update: { validated: out.domainValidated, factualSummary: out.factualSummary, lastResearch: new Date() },
        create: { companyId, url: domain, validated: out.domainValidated, factualSummary: out.factualSummary, lastResearch: new Date() },
      }),
    ]);
    console.log(`[research] ${company.name} via ${out.engine} score=${out.qualityScore} pages=${out.evidence.length}`);
  } catch (e) {
    await prisma.companyResearchJob.update({
      where: { id: dbJobId },
      data: { status: JobStatus.FAILED, error: (e as Error).message, finishedAt: new Date() },
    });
    throw e;
  }
}

/** AI enrichment → preenche o AIEnrichment (criado como DRAFT pela action). */
export async function processEnrichment(data: EnrichmentJobData): Promise<void> {
  const { companyId, enrichmentId } = data;
  const { kie } = clientsFromEnv();
  if (!kie) throw new Error("KIE não configurado");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      registryData: true,
      website: true,
      workspace: { include: { plans: { take: 1, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!company) throw new Error("Empresa não encontrada");
  const plan = company.workspace.plans[0];

  try {
    const { result, creditsConsumed } = await enrichCompany(kie, {
      planObjective: plan?.objective ?? "Gerar pipeline outbound B2B",
      valueProp: plan?.valueProp ?? "",
      companyName: company.name,
      registryFacts: `CNAE: ${company.registryData?.cnae ?? "?"} | status: ${company.registryData?.status ?? "?"}`,
      websiteEvidence: company.website?.factualSummary ?? "",
    });

    await prisma.aIEnrichment.update({
      where: { id: enrichmentId },
      data: {
        status: EnrichmentStatus.GENERATED,
        model: "kie",
        fitScore: result.fitScore,
        hypotheses: result.hypotheses,
        approachAngle: result.approachAngle,
        rawOutput: result as object,
      },
    });
    console.log(`[enrichment] ${company.name} fit=${result.fitScore} credits=${creditsConsumed ?? 0}`);
  } catch (e) {
    await prisma.aIEnrichment.update({
      where: { id: enrichmentId },
      data: { status: EnrichmentStatus.REJECTED, rawOutput: { error: (e as Error).message } },
    });
    throw e;
  }
}

// --- Discovery (busca web + e-mail + Apollo enrich + ranking IA) --------------

export interface DiscoveryJobData {
  runId: string;
  planId: string;
}

const COUNTRY_LABEL: Record<string, { label: string; region: string }> = {
  PT: { label: "Portugal", region: "pt-pt" },
  BR: { label: "Brasil", region: "br-br" },
};

export async function processDiscovery(data: DiscoveryJobData): Promise<void> {
  const { runId, planId } = data;
  const run = await prisma.discoveryRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("DiscoveryRun não encontrado");

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { segments: true, countries: true },
  });
  if (!plan) throw new Error("Plano não encontrado");

  const segment = plan.segments[0]?.label ?? plan.name;
  const cc = plan.countries[0]?.countryCode ?? "PT";
  const loc = COUNTRY_LABEL[cc] ?? { label: cc, region: "wt-wt" };
  const query = buildDiscoveryQuery(segment, loc.label);

  await prisma.discoveryRun.update({
    where: { id: runId },
    data: { status: DiscoveryStatus.RUNNING, query, sources: "web,apollo" },
  });

  const apolloKey = process.env.APOLLO_KEY || null;
  const { kie } = clientsFromEnv();

  try {
    const { companies } = await runDiscovery(query, {
      region: loc.region,
      limit: run.requested,
      apolloKey,
      timeoutMs: 12000,
    });

    let withEmail = 0;
    for (const dc of companies) {
      // Dedup por domínio dentro do workspace.
      const existing = await prisma.company.findFirst({
        where: { workspaceId: run.workspaceId, domain: dc.domain },
      });
      const company = existing
        ? await prisma.company.update({
            where: { id: existing.id },
            data: {
              name: dc.name,
              domain: dc.domain,
              email: dc.email ?? existing.email,
              emailSource: dc.email ? "website" : existing.emailSource,
              emailType: dc.emailType ?? existing.emailType,
              city: dc.apollo?.city ?? existing.city,
            },
          })
        : await prisma.company.create({
            data: {
              workspaceId: run.workspaceId,
              name: dc.name,
              domain: dc.domain,
              countryCode: cc,
              email: dc.email,
              emailSource: dc.email ? "website" : null,
              emailType: dc.emailType,
              city: dc.apollo?.city,
              source: ProviderKind.BROWSER,
            },
          });
      if (dc.email) withEmail++;

      // Ranking por IA (fit ICP + qualidade do contato).
      let rankScore: number | null = null;
      let tier: string | null = null;
      let reasons: unknown = null;
      if (kie) {
        try {
          const { result } = await rankCompany(kie, {
            planObjective: plan.objective,
            icpSegment: segment,
            icpCountry: loc.label,
            companyName: dc.name,
            domain: dc.domain,
            industry: dc.apollo?.industry ?? "",
            employees: dc.apollo?.employees ? String(dc.apollo.employees) : "",
            city: dc.apollo?.city ?? "",
            emailType: dc.emailType ?? "nenhum",
          });
          rankScore = result.score;
          tier = result.tier;
          reasons = result as object;
        } catch {
          /* ranking falhou para este — segue */
        }
      }

      await prisma.discoveryResult.upsert({
        where: { runId_companyId: { runId, companyId: company.id } },
        update: { rankScore, tier, reasons: reasons as object, emailFound: !!dc.email },
        create: { runId, companyId: company.id, rankScore, tier, reasons: reasons as object, emailFound: !!dc.email },
      });
    }

    await prisma.discoveryRun.update({
      where: { id: runId },
      data: { status: DiscoveryStatus.DONE, found: companies.length, withEmail, finishedAt: new Date() },
    });
    console.log(`[discovery] "${query}" → ${companies.length} empresas, ${withEmail} com e-mail`);
  } catch (e) {
    await prisma.discoveryRun.update({
      where: { id: runId },
      data: { status: DiscoveryStatus.FAILED, error: (e as Error).message, finishedAt: new Date() },
    });
    throw e;
  }
}
