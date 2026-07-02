-- CreateEnum
CREATE TYPE "TemplateSettingsStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "TemplateSettingsSource" AS ENUM ('MANUAL', 'WEBSITE_AGENT');

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

-- CreateIndex
CREATE INDEX "EmailTemplateSettings_workspaceId_idx" ON "EmailTemplateSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "EmailTemplateSettings_businessProfileId_idx" ON "EmailTemplateSettings"("businessProfileId");

-- CreateIndex
CREATE INDEX "EmailTemplateSettings_workspaceId_status_isActive_idx" ON "EmailTemplateSettings"("workspaceId", "status", "isActive");

-- Prisma schema cannot express partial indexes. This enforces one active
-- approved email template settings row per workspace at the database level.
CREATE UNIQUE INDEX "EmailTemplateSettings_one_active_approved_per_workspace_idx"
ON "EmailTemplateSettings"("workspaceId")
WHERE "status" = 'APPROVED' AND "isActive" = true;

-- AddForeignKey
ALTER TABLE "EmailTemplateSettings" ADD CONSTRAINT "EmailTemplateSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateSettings" ADD CONSTRAINT "EmailTemplateSettings_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
