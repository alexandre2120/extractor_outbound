# Multi-stage build para Next.js (standalone) em monorepo pnpm.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/ui/package.json packages/ui/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY packages/prompts/package.json packages/prompts/
COPY packages/agents/package.json packages/agents/
RUN pnpm install --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @repo/db generate
RUN pnpm --filter @repo/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
