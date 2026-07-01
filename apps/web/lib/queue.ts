import { Queue, type ConnectionOptions } from "bullmq";

const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const connection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port || 6379),
};

// Cache global para não recriar filas a cada HMR/request no dev.
const g = globalThis as unknown as { __queues?: Record<string, Queue> };
g.__queues ??= {};

function queue(name: string): Queue {
  g.__queues![name] ??= new Queue(name, { connection });
  return g.__queues![name]!;
}

export const researchQueue = queue("research");
export const enrichmentQueue = queue("enrichment");
export const outboundQueue = queue("outbound");
export const discoveryQueue = queue("discovery");
