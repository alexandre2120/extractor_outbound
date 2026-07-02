import { z } from "zod";

// ---------------------------------------------------------------------------
// Contratos de I/O compartilhados entre web, worker e agentes.
// ---------------------------------------------------------------------------

export const marketEnum = z.enum(["BRAZIL", "PORTUGAL", "EUROPE"]);

export const businessProfileInput = z.object({
  name: z.string().min(2),
  offer: z.string().min(4),
  valueProp: z.string().min(4),
  positioning: z.string().optional(),
  tone: z.string().optional(),
  objective: z.string().optional(),
});
export type BusinessProfileInput = z.infer<typeof businessProfileInput>;

export const planInput = z.object({
  name: z.string().min(2),
  objective: z.string().min(4),
  valueProp: z.string().optional(),
  tone: z.string().optional(),
  businessProfileId: z.string().optional(),
  markets: z.array(marketEnum).default([]),
  countries: z.array(z.string().length(2)).default([]),
  segments: z
    .array(
      z.object({
        label: z.string(),
        cnaeCodes: z.string().optional(),
        keywords: z.string().optional(),
      }),
    )
    .default([]),
  personas: z
    .array(z.object({ role: z.string(), seniority: z.string().optional() }))
    .default([]),
});
export type PlanInput = z.infer<typeof planInput>;

export const companyInput = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  domain: z.string().optional(),
  email: z.string().email().optional(),
});
export type CompanyInput = z.infer<typeof companyInput>;

// Saída estruturada esperada do enrichment por IA (validada antes de persistir).
export const aiEnrichmentOutput = z.object({
  fitScore: z.number().min(0).max(100),
  hypotheses: z.array(z.string()).min(1),
  approachAngle: z.string(),
  reasoning: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([]),
});
export type AIEnrichmentOutput = z.infer<typeof aiEnrichmentOutput>;

// Saída do browser research.
export const researchResult = z.object({
  domainValidated: z.boolean(),
  pagesVisited: z.array(z.string()),
  factualSummary: z.string(),
  evidence: z.array(
    z.object({
      url: z.string(),
      pageType: z.string().optional(),
      extracted: z.string(),
    }),
  ),
  qualityScore: z.number().min(0).max(100),
});
export type ResearchResult = z.infer<typeof researchResult>;

export const rankingOutput = z.object({
  score: z.number().min(0).max(100),
  tier: z.enum(["A", "B", "C"]),
  fitReasons: z.array(z.string()).default([]),
  contactQuality: z.string().optional(),
  redFlags: z.array(z.string()).default([]),
});
export type RankingOutput = z.infer<typeof rankingOutput>;

export const generatedMessageOutput = z.object({
  subject: z.string().optional(),
  body: z.string().min(1),
  channel: z.string().default("email"),
});
export type GeneratedMessageOutput = z.infer<typeof generatedMessageOutput>;

const nullableTrimmedString = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const extractedTemplateSettingsOutput = z.object({
  brandName: nullableTrimmedString,
  websiteUrl: z.string().trim().min(1),
  logoUrl: nullableTrimmedString,
  primaryColor: nullableTrimmedString,
  accentColor: nullableTrimmedString,
  backgroundColor: nullableTrimmedString,
  fontFamily: nullableTrimmedString,
  senderName: nullableTrimmedString,
  senderRole: nullableTrimmedString,
  signature: nullableTrimmedString,
  ctaLabel: nullableTrimmedString,
  ctaUrl: nullableTrimmedString,
  offerSummary: nullableTrimmedString,
  valueProposition: nullableTrimmedString,
  tone: nullableTrimmedString,
  evidenceRefs: z.array(z.string()).default([]),
});
export type ExtractedTemplateSettingsOutput = z.infer<
  typeof extractedTemplateSettingsOutput
>;
