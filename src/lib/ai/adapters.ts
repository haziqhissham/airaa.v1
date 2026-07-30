import "server-only";

/**
 * Provider adapters implemented over each vendor's REST API (no SDK deps).
 * Models are env-configurable with current, capable defaults.
 */

import type { AIProvider, GenerateOptions } from "@/lib/ai/provider";

const CLAUDE_MODEL = process.env.AI_CLAUDE_MODEL ?? "claude-sonnet-5";
const OPENAI_MODEL = process.env.AI_OPENAI_MODEL ?? "gpt-4o";
const GEMINI_MODEL = process.env.AI_GEMINI_MODEL ?? "gemini-1.5-pro";

export const claudeProvider = (): AIProvider => ({
  name: "claude",
  async generate(prompt: string, opts: GenerateOptions = {}) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0.4,
        system: opts.system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? "";
  },
});

export const openaiProvider = (): AIProvider => ({
  name: "openai",
  async generate(prompt: string, opts: GenerateOptions = {}) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set.");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0.4,
        response_format: opts.json ? { type: "json_object" } : undefined,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  },
});

export const geminiProvider = (): AIProvider => ({
  name: "gemini",
  async generate(prompt: string, opts: GenerateOptions = {}) {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) throw new Error("GOOGLE_AI_API_KEY is not set.");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: opts.system
            ? { parts: [{ text: opts.system }] }
            : undefined,
          generationConfig: {
            maxOutputTokens: opts.maxTokens ?? 1200,
            temperature: opts.temperature ?? 0.4,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  },
});
