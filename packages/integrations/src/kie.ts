/**
 * Client KIE — endpoint OpenAI-compatível com o modelo no PATH:
 *   POST {baseUrl}/{model}/v1/chat/completions
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  creditsConsumed?: number;
  raw: unknown;
}

export class KieClient {
  constructor(
    private apiKey: string,
    private baseUrl = "https://api.kie.ai",
    private defaultModel = "gemini-2.5-flash",
  ) {}

  async chat(
    messages: ChatMessage[],
    opts: { model?: string; maxTokens?: number } = {},
  ): Promise<ChatResult> {
    const model = opts.model ?? this.defaultModel;
    const url = `${this.baseUrl}/${model}/v1/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`KIE ${res.status}: ${body.slice(0, 300)}`);
    }
    const d = (await res.json()) as Record<string, any>;
    const content: string = d.choices?.[0]?.message?.content ?? "";
    return { content, creditsConsumed: d.credits_consumed, raw: d };
  }

  /** Chat que espera JSON; remove cercas de código e faz parse. */
  async chatJson<T = unknown>(
    messages: ChatMessage[],
    opts: { model?: string; maxTokens?: number } = {},
  ): Promise<{ data: T; creditsConsumed?: number }> {
    const { content, creditsConsumed } = await this.chat(messages, opts);
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
    return { data: JSON.parse(slice) as T, creditsConsumed };
  }
}
