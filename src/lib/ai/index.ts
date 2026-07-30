import "server-only";

/** Registers the AI provider adapters and re-exports the factory. */

import { registerProvider, getAIProvider } from "@/lib/ai/provider";
import { claudeProvider, openaiProvider, geminiProvider } from "@/lib/ai/adapters";

let registered = false;
function ensureRegistered() {
  if (registered) return;
  registerProvider("claude", claudeProvider);
  registerProvider("openai", openaiProvider);
  registerProvider("gemini", geminiProvider);
  registered = true;
}

export function ai(name?: Parameters<typeof getAIProvider>[0]) {
  ensureRegistered();
  return getAIProvider(name);
}

export type { AIProvider, AIProviderName } from "@/lib/ai/provider";
