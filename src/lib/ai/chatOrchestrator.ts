/**
 * Central “brain” – every *new* user message pipes through here once.
 * It decides whether to:
 *   • create an event,
 *   • alert admins,
 *   • just answer like ChatGPT.
 */

import { detectIntent }  from './intentDetector';
import { maybeCreateEvent } from './eventPlanner';
import { callLLM } from './llmClient';

export type OrchestratorResult =
  | { type: 'event_created'; event: any; followUp: string }
  | { type: 'admin_alert_sent' }
  | { type: 'ai_reply'; reply: string }
  | { type: 'noop' };

const ASSISTANT_SYSTEM = `
You are “Community AI”, a cheerful assistant inside a fitness / hobby community.
Answer concisely, add emojis when appropriate, be friendly and supportive.
`;

export async function handleNewMessage(opts: {
  text: string;
  communityId: string;
  userId: string;
}): Promise<OrchestratorResult> {
  const { text, communityId, userId } = opts;

  /* 1️⃣ Intent detection ------------------------------------------------ */
  const intent = await detectIntent(text);

  /* 2️⃣ Branch based on intent ----------------------------------------- */
  if (intent.intent === 'create_event') {
    const event = await maybeCreateEvent(text, communityId, userId);
    if (!event) return { type: 'noop' };

    return {
      type     : 'event_created',
      event,
      followUp : `📅 Event *${event.title}* created! Should I invite everyone?`,
    };
  }

  if (intent.intent === 'admin_alert') {
    // TODO: actual email / notification
    return { type: 'admin_alert_sent' };
  }

  /* 3️⃣ Default – generate chat reply ---------------------------------- */
  const reply = await callLLM({
    model  : 'gpt-4o-mini',
    prompt : text,
    system : ASSISTANT_SYSTEM,
  });

  return { type: 'ai_reply', reply };
}
