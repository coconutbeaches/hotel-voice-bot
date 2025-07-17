import { ConversationMessage, Conversation, LLMResponse } from '@hotel-voice-bot/shared';
import { logger } from '../../utils/logger.js';

export class EscalationHandler {
  private escalationKeywords = [
    'manager',
    'supervisor',
    'human',
    'person',
    'staff',
    'complaint',
    'angry',
    'frustrated',
    'unacceptable',
    'terrible',
    'awful',
    'disappointed'
  ];

  public async shouldEscalate(
    message: ConversationMessage,
    conversation: Conversation,
    llmResponse: LLMResponse
  ): Promise<{ shouldEscalate: boolean; reason?: string }> {
    // Check if already escalated
    if (conversation.context.isEscalated) {
      return { shouldEscalate: true, reason: 'already_escalated' };
    }

    // Check for escalation keywords
    if (this.containsEscalationKeywords(message.content)) {
      return { shouldEscalate: true, reason: 'escalation_keywords' };
    }

    // Check if LLM explicitly requests escalation
    if (llmResponse.shouldEscalate) {
      return { shouldEscalate: true, reason: llmResponse.escalationReason || 'llm_request' };
    }

    // Check conversation length (escalate after too many exchanges)
    if (this.isConversationTooLong(conversation)) {
      return { shouldEscalate: true, reason: 'conversation_length' };
    }

    // Check for repeated failed attempts
    if (this.hasRepeatedFailures(conversation)) {
      return { shouldEscalate: true, reason: 'repeated_failures' };
    }

    return { shouldEscalate: false };
  }

  private containsEscalationKeywords(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.escalationKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private isConversationTooLong(conversation: Conversation): boolean {
    // Escalate if conversation has been going on for too long
    const conversationAge = Date.now() - new Date(conversation.createdAt).getTime();
    const maxConversationTime = 30 * 60 * 1000; // 30 minutes
    return conversationAge > maxConversationTime;
  }

  private hasRepeatedFailures(conversation: Conversation): boolean {
    // This would check for repeated failed attempts to resolve an issue
    // For now, return false as we don't have message history analysis
    return false;
  }

  public async escalateToHuman(
    conversation: Conversation,
    reason: string
  ): Promise<void> {
    logger.info('Escalating conversation to human agent', {
      conversationId: conversation.id,
      reason,
      phoneNumber: conversation.phoneNumber
    });

    // Mark conversation as escalated
    conversation.context.isEscalated = true;
    conversation.context.escalationReason = reason;
    conversation.status = 'escalated';

    // Here you would typically:
    // 1. Notify human agents
    // 2. Update conversation status in database
    // 3. Send escalation message to guest
    // 4. Create escalation ticket/case
  }
}
