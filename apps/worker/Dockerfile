FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY packages/prompts/package.json packages/prompts/
COPY packages/agents/package.json packages/agents/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile=false

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @repo/db generate
CMD ["pnpm", "--filter", "@repo/worker", "start"]
