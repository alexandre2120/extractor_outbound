import { prisma } from "@repo/db";

/** Single-tenant local: resolve (ou cria) o workspace padrão. */
export async function getWorkspace() {
  const existing = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.workspace.create({
    data: { name: "Meu Workspace", slug: "default" },
  });
}

/** Lista (ou cria) a lead list padrão do workspace. */
export async function getDefaultLeadList(workspaceId: string) {
  const existing = await prisma.leadList.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.leadList.create({
    data: { workspaceId, name: "Lista principal" },
  });
}
