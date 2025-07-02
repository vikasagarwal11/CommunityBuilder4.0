/**
 * Thin, swappable wrapper around multiple LLM providers.
 * – Supports JSON-mode (OpenAI & Groq) with the  `jsonMode` flag.
 * – If you want to add Anthropic, Cohere, etc. you only touch this file.
 */
import OpenAI from 'openai';
import Groq   from 'groq-sdk';

type Provider = 'openai' | 'groq';

export interface LLMOpts {
  model: string;
  prompt: string;
  provider?: Provider;
  system?: string;
  jsonMode?: boolean;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY, // <- add to .env
});

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,   // <- already in your .env
});

export async function callLLM(opts: LLMOpts): Promise<string> {
  const {
    model,
    prompt,
    provider = 'openai',
    system,
    jsonMode = false,
  } = opts;

  const messages = [
    system ? { role: 'system', content: system } : null,
    { role: 'user', content: prompt },
  ].filter(Boolean) as { role: string; content: string }[];

  /* ------------------------------------------------------------------ */
  if (provider === 'openai') {
    const res = await openai.chat.completions.create({
      model,
      messages,
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
    return res.choices[0].message?.content ?? '';
  }

  if (provider === 'groq') {
    const res = await groq.chat.completions.create({
      model,
      messages,
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
    return (res.choices[0] as any).message?.content ?? '';
  }

  throw new Error(`Unsupported provider: ${provider}`);
}