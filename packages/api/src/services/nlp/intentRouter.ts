import { IntentMatch, ConversationMessage } from '@hotel-voice-bot/shared';

export class IntentRouter {
  constructor(private intents: any[]) {}

  public matchIntent(message: ConversationMessage): IntentMatch[] {
    // Simple keyword match logic (to be replaced with embedding match)
    const matchedIntents: IntentMatch[] = this.intents
      .filter((intent) =>
        intent.keywords.some((keyword: string) =>
          message.content.toLowerCase().includes(keyword.toLowerCase())
        )
      )
      .map((intent) => ({
        intent,
        confidence: 1.0, // Dummy confidence
        extractedEntities: {}, // Stub for extracted entities
      }));

    return matchedIntents.sort((a, b) => b.confidence - a.confidence);
  }
}

