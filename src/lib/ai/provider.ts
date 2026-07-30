import "server-only";

/**
 * Provider-agnostic AI interface. Report generators call `generate()` without
 * knowing which model answers. Concrete adapters (OpenAI, Claude, Gemini) are
 * added in Step 8; this file defines the contract + factory so the rest of the
 * app can depend on it now.
 */

export type AIProviderName = "claude" | "openai" | "gemini";

export interface GenerateOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Force JSON output where the adapter supports it. */
  json?: boolean;
}

export interface AIProvider {
  readonly name: AIProviderName;
  generate(prompt: string, opts?: GenerateOptions): Promise<string>;
}

/** Registry populated by adapters in Step 8. */
const registry = new Map<AIProviderName, () => AIProvider>();

export function registerProvider(name: AIProviderName, factory: () => AIProvider) {
  registry.set(name, factory);
}

/** Resolve a provider by name, defaulting to the configured provider. */
export function getAIProvider(name?: AIProviderName): AIProvider {
  const chosen =
    name ?? (process.env.AI_DEFAULT_PROVIDER as AIProviderName) ?? "claude";
  const factory = registry.get(chosen);
  if (!factory) {
    throw new Error(
      `AI provider "${chosen}" is not registered. Available: ${[...registry.keys()].join(", ") || "none (added in Step 8)"}`,
    );
  }
  return factory();
}
