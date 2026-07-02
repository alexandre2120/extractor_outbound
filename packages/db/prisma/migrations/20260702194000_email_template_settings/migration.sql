-- CreateEnum
CREATE TYPE "Market" AS ENUM ('BRAZIL', 'PORTUGAL', 'EUROPE');

-- CreateEnum
CREATE TYPE "TruthLayer" AS ENUM ('REGISTRY', 'WEBSITE', 'AI');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('DRAFT', 'GENERATED', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'SCHEDULED', 'SENT');

-- CreateEnum
CREATE TYPE "DeliveryEventType" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'REPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('PENDING', 'BLOCKED', 'IN_PROGRESS', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('CNPJ_REGISTRY', 'PT_REGISTRY', 'EU_REGISTRY', 'AI_GATEWAY', 'EMAIL', 'BROWSER');

-- CreateEnum
CREATE TYPE "TemplateSettingsStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "TemplateSettingsSource" AS ENUM ('MANUAL', 'WEBSITE_AGENT');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offer" TEXT NOT NULL,
    "valueProp" TEXT NOT NULL,
    "positioning" TEXT,
    "tone" TEXT,
    "objective" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplateSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessProfileId" TEXT,
    "status" "TemplateSettingsStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "TemplateSettingsSource" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "brandName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "backgroundColor" TEXT,
    "fontFamily" TEXT,
    "senderName" TEXT,
    "senderRole" TEXT,
    "signature" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "offerSummary" TEXT,
    "valueProposition" TEXT,
    "tone" TEXT,
    "rawExtraction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "EmailTemplateSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessProfileId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "valueProp" TEXT,
    "tone" TEXT,
    "isAiRefined" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMarket" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "market" "Market" NOT NULL,

    CONSTRAINT "PlanMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCountry" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,

    CONSTRAINT "PlanCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSegment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cnaeCodes" TEXT,
    "keywords" TEXT,
    "description" TEXT,

    CONSTRAINT "PlanSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPersona" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "seniority" TEXT,
    "painPoints" TEXT,
    "description" TEXT,

    CONSTRAINT "PlanPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConstraint" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PlanConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadList" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadListMember" (
    "id" TEXT NOT NULL,
    "leadListId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "countryCode" TEXT,
    "domain" TEXT,
    "email" TEXT,
    "emailSource" TEXT,
    "emailType" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "source" "ProviderKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRegistryData" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "truthLayer" "TruthLayer" NOT NULL DEFAULT 'REGISTRY',
    "provider" "ProviderKind" NOT NULL,
    "raw" JSONB NOT NULL,
    "cnae" TEXT,
    "foundedAt" TIMESTAMP(3),
    "employeeBand" TEXT,
    "capital" TEXT,
    "status" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyRegistryData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyWebsite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "lastResearch" TIMESTAMP(3),
    "factualSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyResearchJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "targetPages" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyResearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchEvidence" (
    "id" TEXT NOT NULL,
    "researchJobId" TEXT NOT NULL,
    "truthLayer" "TruthLayer" NOT NULL DEFAULT 'WEBSITE',
    "url" TEXT NOT NULL,
    "pageType" TEXT,
    "extracted" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSnapshot" (
    "id" TEXT NOT NULL,
    "researchJobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "content" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEnrichment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "truthLayer" "TruthLayer" NOT NULL DEFAULT 'AI',
    "status" "EnrichmentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "fitScore" DOUBLE PRECISION,
    "hypotheses" JSONB,
    "approachAngle" TEXT,
    "rawOutput" JSONB,
    "inputHash" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundCampaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" TEXT NOT NULL DEFAULT 'email',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceStep" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "template" TEXT,

    CONSTRAINT "SequenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "stepId" TEXT,
    "companyId" TEXT NOT NULL,
    "enrichmentId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "DeliveryEventType" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'brevo',
    "providerId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'PENDING',
    "query" TEXT,
    "sources" TEXT,
    "requested" INTEGER NOT NULL DEFAULT 15,
    "found" INTEGER NOT NULL DEFAULT 0,
    "withEmail" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rankScore" DOUBLE PRECISION,
    "tier" TEXT,
    "reasons" JSONB,
    "emailFound" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSource" (
    "id" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "agent" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dependsOn" TEXT,
    "blocks" TEXT,
    "notes" TEXT,
    "docRefs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckpoint" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "label" TEXT NOT NULL,
    "module" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentationArtifact" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "module" TEXT,
    "exists" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentationArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "BusinessProfile_workspaceId_idx" ON "BusinessProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "EmailTemplateSettings_workspaceId_idx" ON "EmailTemplateSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "EmailTemplateSettings_businessProfileId_idx" ON "EmailTemplateSettings"("businessProfileId");

-- CreateIndex
CREATE INDEX "EmailTemplateSettings_workspaceId_status_isActive_idx" ON "EmailTemplateSettings"("workspaceId", "status", "isActive");

-- CreateIndex
CREATE INDEX "Plan_workspaceId_idx" ON "Plan"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanMarket_planId_market_key" ON "PlanMarket"("planId", "market");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCountry_planId_countryCode_key" ON "PlanCountry"("planId", "countryCode");

-- CreateIndex
CREATE INDEX "PlanSegment_planId_idx" ON "PlanSegment"("planId");

-- CreateIndex
CREATE INDEX "PlanPersona_planId_idx" ON "PlanPersona"("planId");

-- CreateIndex
CREATE INDEX "PlanConstraint_planId_idx" ON "PlanConstraint"("planId");

-- CreateIndex
CREATE INDEX "LeadList_workspaceId_idx" ON "LeadList"("workspaceId");

-- CreateIndex
CREATE INDEX "LeadList_planId_idx" ON "LeadList"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadListMember_leadListId_companyId_key" ON "LeadListMember"("leadListId", "companyId");

-- CreateIndex
CREATE INDEX "Company_workspaceId_idx" ON "Company"("workspaceId");

-- CreateIndex
CREATE INDEX "Company_domain_idx" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Company_workspaceId_taxId_key" ON "Company"("workspaceId", "taxId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRegistryData_companyId_key" ON "CompanyRegistryData"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWebsite_companyId_key" ON "CompanyWebsite"("companyId");

-- CreateIndex
CREATE INDEX "CompanyResearchJob_companyId_idx" ON "CompanyResearchJob"("companyId");

-- CreateIndex
CREATE INDEX "CompanyResearchJob_status_idx" ON "CompanyResearchJob"("status");

-- CreateIndex
CREATE INDEX "ResearchEvidence_researchJobId_idx" ON "ResearchEvidence"("researchJobId");

-- CreateIndex
CREATE INDEX "ResearchSnapshot_researchJobId_idx" ON "ResearchSnapshot"("researchJobId");

-- CreateIndex
CREATE INDEX "AIEnrichment_companyId_idx" ON "AIEnrichment"("companyId");

-- CreateIndex
CREATE INDEX "AIEnrichment_inputHash_idx" ON "AIEnrichment"("inputHash");

-- CreateIndex
CREATE INDEX "OutboundCampaign_workspaceId_idx" ON "OutboundCampaign"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceStep_campaignId_order_key" ON "SequenceStep"("campaignId", "order");

-- CreateIndex
CREATE INDEX "GeneratedMessage_companyId_idx" ON "GeneratedMessage"("companyId");

-- CreateIndex
CREATE INDEX "GeneratedMessage_campaignId_idx" ON "GeneratedMessage"("campaignId");

-- CreateIndex
CREATE INDEX "DeliveryEvent_messageId_idx" ON "DeliveryEvent"("messageId");

-- CreateIndex
CREATE INDEX "DeliveryEvent_type_idx" ON "DeliveryEvent"("type");

-- CreateIndex
CREATE INDEX "DiscoveryRun_planId_idx" ON "DiscoveryRun"("planId");

-- CreateIndex
CREATE INDEX "DiscoveryRun_status_idx" ON "DiscoveryRun"("status");

-- CreateIndex
CREATE INDEX "DiscoveryResult_runId_idx" ON "DiscoveryResult"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryResult_runId_companyId_key" ON "DiscoveryResult"("runId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSource_kind_name_key" ON "ProviderSource"("kind", "name");

-- CreateIndex
CREATE INDEX "AgentTask_agent_idx" ON "AgentTask"("agent");

-- CreateIndex
CREATE INDEX "AgentTask_status_idx" ON "AgentTask"("status");

-- CreateIndex
CREATE INDEX "ProjectCheckpoint_module_idx" ON "ProjectCheckpoint"("module");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentationArtifact_path_key" ON "DocumentationArtifact"("path");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateSettings" ADD CONSTRAINT "EmailTemplateSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateSettings" ADD CONSTRAINT "EmailTemplateSettings_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMarket" ADD CONSTRAINT "PlanMarket_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCountry" ADD CONSTRAINT "PlanCountry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSegment" ADD CONSTRAINT "PlanSegment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPersona" ADD CONSTRAINT "PlanPersona_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanConstraint" ADD CONSTRAINT "PlanConstraint_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadList" ADD CONSTRAINT "LeadList_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadList" ADD CONSTRAINT "LeadList_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadListMember" ADD CONSTRAINT "LeadListMember_leadListId_fkey" FOREIGN KEY ("leadListId") REFERENCES "LeadList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadListMember" ADD CONSTRAINT "LeadListMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRegistryData" ADD CONSTRAINT "CompanyRegistryData_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyWebsite" ADD CONSTRAINT "CompanyWebsite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyResearchJob" ADD CONSTRAINT "CompanyResearchJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvidence" ADD CONSTRAINT "ResearchEvidence_researchJobId_fkey" FOREIGN KEY ("researchJobId") REFERENCES "CompanyResearchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSnapshot" ADD CONSTRAINT "ResearchSnapshot_researchJobId_fkey" FOREIGN KEY ("researchJobId") REFERENCES "CompanyResearchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEnrichment" ADD CONSTRAINT "AIEnrichment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundCampaign" ADD CONSTRAINT "OutboundCampaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundCampaign" ADD CONSTRAINT "OutboundCampaign_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceStep" ADD CONSTRAINT "SequenceStep_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutboundCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedMessage" ADD CONSTRAINT "GeneratedMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutboundCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedMessage" ADD CONSTRAINT "GeneratedMessage_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "SequenceStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedMessage" ADD CONSTRAINT "GeneratedMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedMessage" ADD CONSTRAINT "GeneratedMessage_enrichmentId_fkey" FOREIGN KEY ("enrichmentId") REFERENCES "AIEnrichment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "GeneratedMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryResult" ADD CONSTRAINT "DiscoveryResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryResult" ADD CONSTRAINT "DiscoveryResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckpoint" ADD CONSTRAINT "ProjectCheckpoint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
-- Prisma schema cannot express partial indexes. This enforces one active
-- approved email template settings row per workspace at the database level.
CREATE UNIQUE INDEX "EmailTemplateSettings_one_active_approved_per_workspace_idx"
ON "EmailTemplateSettings"("workspaceId")
WHERE "status" = 'APPROVED' AND "isActive" = true;
