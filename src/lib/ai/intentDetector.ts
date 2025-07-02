import { callLLM } from './llmClient';

export type Intent =
  | 'create_event'
  | 'schedule_poll'
  | 'admin_alert'
  | 'general_chat';

export interface DetectedIntent {
  intent: Intent;
  confidence: number; // 0-1
  entities: {
    date?: string;          // ISO (yyyy-mm-dd)
    time?: string;          // 24-h hh:mm
    location?: string;
    capacity?: number;
    title?: string;
    description?: string;
  };
}

const schema = `{
  "intent": "create_event|schedule_poll|admin_alert|general_chat",
  "confidence": "number (0-1)",
  "entities": {
    "date": "ISO8601 date string?",
    "time": "HH:MM?",
    "location": "string?",
    "capacity": "number?",
    "title": "string?",
    "description": "string?"
  }
}`;

export async function detectIntent(text: string): Promise<DetectedIntent> {
  const json = await callLLM({
    model    : 'gpt-4o-mini',
    provider : 'openai',
    prompt   : text,
    system   : `You are an intent detection engine. 
Return ONLY valid JSON exactly matching this schema (no markdown):\n${schema}`,
    jsonMode : true,
  });

  try {
    return JSON.parse(json);
  } catch (err) {
    console.error('intentDetector JSON parse error', err, json);
    return { intent: 'general_chat', confidence: 0, entities: {} };
  }
}
