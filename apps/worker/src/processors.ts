import {
  prisma,
  JobStatus,
  EnrichmentStatus,
} from "@repo/db";
import {
  clientsFromEnv,
  enrichCompany,
  researchCompany,
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
