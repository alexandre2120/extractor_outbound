import { Queue, type ConnectionOptions } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

/** Opções de conexão compartilhadas — BullMQ gere a própria conexão ioredis. */
export const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
};

export const QUEUE_NAMES = {
  ingestion: "ingestion", // ingestão de empresas por provider
  research: "research", // browser research jobs
  enrichment: "enrichment", // AI enrichment (gated, manual/lote)
  outbound: "outbound", // geração/envio de mensagens
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const queues: Record<QueueName, Queue> = {
  ingestion: new Queue(QUEUE_NAMES.ingestion, { connection }),
  research: new Queue(QUEUE_NAMES.research, { connection }),
  enrichment: new Queue(QUEUE_NAMES.enrichment, { connection }),
  outbound: new Queue(QUEUE_NAMES.outbound, { connection }),
};
