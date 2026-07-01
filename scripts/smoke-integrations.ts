/**
 * Smoke test das integrações (chamadas reais). Rodar:
 *   set -a; . ./.env.local; set +a; pnpm exec tsx scripts/smoke-integrations.ts
 */
import {
  clientsFromEnv,
  enrichCompany,
  generateColdMessage,
  runResearch,
} from "@repo/integrations";

async function main() {
  const { cnpja, kie, brevo } = clientsFromEnv();
  console.log("clients:", {
    cnpja: !!cnpja,
    kie: !!kie,
    brevo: !!brevo,
  });

  // 1) CNPJá
  if (!cnpja) throw new Error("CNPJá não configurado");
  const reg = await cnpja.lookup("00000000000191");
  console.log("\n[CNPJá]", { name: reg.name, status: reg.status, cnae: reg.cnaeText });

  // 2) Research (fetch-based)
  const research = await runResearch("https://kie.ai", { maxPages: 3, timeoutMs: 15000 });
  console.log("\n[Research]", {
    domainValidated: research.domainValidated,
    pages: research.pagesVisited.length,
    score: research.qualityScore,
  });

  // 3) Enrichment (KIE)
  if (!kie) throw new Error("KIE não configurado");
  const enr = await enrichCompany(kie, {
    planObjective: "Vender automação de outbound B2B para agências",
    valueProp: "Mais reuniões qualificadas com menos esforço",
    companyName: reg.name,
    registryFacts: `CNAE: ${reg.cnaeText ?? "?"} | status: ${reg.status ?? "?"}`,
    websiteEvidence: research.factualSummary.slice(0, 800),
  });
  console.log("\n[Enrichment]", {
    fitScore: enr.result.fitScore,
    angle: enr.result.approachAngle,
    hyp: enr.result.hypotheses.slice(0, 2),
    credits: enr.creditsConsumed,
  });

  // 4) Geração de mensagem (KIE)
  const msg = await generateColdMessage(kie, {
    planObjective: "Vender automação de outbound B2B para agências",
    valueProp: "Mais reuniões qualificadas com menos esforço",
    tone: "direto e consultivo",
    companyName: reg.name,
    approachAngle: enr.result.approachAngle,
    factualSummary: research.factualSummary.slice(0, 600),
  });
  console.log("\n[Mensagem]", { subject: msg.result.subject, body: msg.result.body.slice(0, 220) });

  console.log("\n✅ chain ok");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
