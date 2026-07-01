import { Worker } from "bullmq";
import { connection, QUEUE_NAMES, queues } from "./queues.js";
import { processResearch, processEnrichment, processDiscovery } from "./processors.js";

/**
 * Worker de jobs assíncronos: ingestão, browser research, AI enrichment e
 * outbound. Camada 1 = scaffolding dos processors; lógica entra na Camada 2.
 *
 * Regra de custo: enrichment/outbound NUNCA processam a base inteira de forma
 * automática — sempre disparo manual ou lote pequeno aprovado.
 */

const concurrency = 2;

const workers = [
  new Worker(
    QUEUE_NAMES.ingestion,
    async (job) => {
      console.log(`[ingestion] job ${job.id}`, job.data);
      // TODO(Camada 2): chamar adapter de provider e persistir Company.
      return { ok: true };
    },
    { connection, concurrency },
  ),

  new Worker(
    QUEUE_NAMES.discovery,
    async (job) => {
      await processDiscovery(job.data);
      return { ok: true };
    },
    { connection, concurrency: 1 },
  ),

  new Worker(
    QUEUE_NAMES.research,
    async (job) => {
      await processResearch(job.data);
      return { ok: true };
    },
    { connection, concurrency: 1 },
  ),

  new Worker(
    QUEUE_NAMES.enrichment,
    async (job) => {
      await processEnrichment(job.data);
      return { ok: true };
    },
    { connection, concurrency: 1 },
  ),

  new Worker(
    QUEUE_NAMES.outbound,
    async (job) => {
      console.log(`[outbound] job ${job.id}`, job.data);
      // TODO(Camada 2): gerar mensagem / enviar via Brevo → DeliveryEvent.
      return { ok: true };
    },
    { connection, concurrency },
  ),
];

console.log("worker online — filas:", Object.values(QUEUE_NAMES).join(", "));

async function shutdown() {
  console.log("encerrando workers...");
  await Promise.all(workers.map((w) => w.close()));
  await Promise.all(Object.values(queues).map((q) => q.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
