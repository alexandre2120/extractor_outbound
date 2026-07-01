import { z } from "zod";

/**
 * Contrato de ambiente compartilhado. Toda variável nova DEVE ser adicionada
 * aqui, no .env.example e em docs/architecture/env-contract.md.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  // Integrações — opcionais na Camada 1, validadas sob demanda na Camada 2.
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().optional(),
  BREVO_WEBHOOK_SECRET: z.string().optional(),

  KIE_API_KEY: z.string().optional(),
  KIE_BASE_URL: z.string().url().default("https://api.kie.ai"),
  KIE_DEFAULT_MODEL: z.string().optional(),

  CNPJA_API_KEY: z.string().optional(),
  CNPJWS_API_KEY: z.string().optional(),

  APOLLO_KEY: z.string().optional(),

  BROWSER_RESEARCH_HEADLESS: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  BROWSER_RESEARCH_TIMEOUT_MS: z.coerce.number().default(30000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Valida e retorna o ambiente. Lança erro legível se faltar variável obrigatória. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Indica se uma integração está configurada (para gating de jobs caros). */
export function hasIntegration(
  env: Env,
  name: "brevo" | "kie" | "cnpja" | "cnpjws",
): boolean {
  switch (name) {
    case "brevo":
      return Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL);
    case "kie":
      return Boolean(env.KIE_API_KEY);
    case "cnpja":
      return Boolean(env.CNPJA_API_KEY);
    case "cnpjws":
      return Boolean(env.CNPJWS_API_KEY);
  }
}
