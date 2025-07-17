import { 
  ConversationMessage, 
  Conversation, 
  IntentMatch,
  PromptTemplate,
  HotelInfo 
} from '@hotel-voice-bot/shared';
import { logger } from '../../utils/logger.js';

export class PromptBuilder {
  private promptTemplates: Map<string, PromptTemplate>;
  private hotelInfo: HotelInfo;

  constructor(promptTemplates: PromptTemplate[], hotelInfo: HotelInfo) {
    this.promptTemplates = new Map(
      promptTemplates.map(template => [template.name, template])
    );
    this.hotelInfo = hotelInfo;
  }

  public async buildPrompt(
    message: ConversationMessage,
    conversation: Conversation,
    conversationHistory: ConversationMessage[],
    intentMatch?: IntentMatch
  ): Promise<string> {
    try {
      // Get the appropriate prompt template
      const templateName = this.getTemplateForIntent(intentMatch?.intent.name);
      const template = this.promptTemplates.get(templateName);

      if (!template) {
        logger.warn('No template found, using default', { templateName });
        return this.buildDefaultPrompt(message, conversation, conversationHistory);
      }

      // Build context sections
      const systemContext = this.buildSystemContext();
      const hotelContext = this.buildHotelContext();
      const guestContext = this.buildGuestContext(conversation);
      const conversationContext = this.buildConversationContext(conversationHistory);
      const intentContext = this.buildIntentContext(intentMatch);

      // Replace template variables
      let prompt = template.template;
      
      const variables = {
        SYSTEM_CONTEXT: systemContext,
        HOTEL_CONTEXT: hotelContext,
        GUEST_CONTEXT: guestContext,
        CONVERSATION_HISTORY: conversationContext,
        INTENT_CONTEXT: intentContext,
        USER_MESSAGE: message.content,
        CURRENT_TIME: new Date().toISOString(),
        HOTEL_NAME: this.hotelInfo.name,
        HOTEL_LOCATION: this.hotelInfo.location
      };

      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      logger.info('Prompt built successfully', { 
        templateName, 
        messageId: message.id,
        promptLength: prompt.length 
      });

      return prompt;
    } catch (error) {
      logger.error('Error building prompt', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return this.buildDefaultPrompt(message, conversation, conversationHistory);
    }
  }

  private getTemplateForIntent(intentName?: string): string {
    if (!intentName) return 'default_conversation';
    
    const templateMap: Record<string, string> = {
      'faq': 'faq_response',
      'service_request': 'service_request',
      'complaint': 'complaint_handling',
      'booking': 'booking_assistance',
      'general': 'general_assistance'
    };

    return templateMap[intentName] || 'default_conversation';
  }

  private buildSystemContext(): string {
    return `You are a helpful hotel assistant AI for ${this.hotelInfo.name}. 
You should be friendly, professional, and helpful while maintaining hotel standards.
Always provide accurate information about hotel services, amenities, and policies.
If you cannot answer a question, offer to connect the guest with a human agent.`;
  }

  private buildHotelContext(): string {
    const amenities = this.hotelInfo.amenities.join(', ');
    const services = this.hotelInfo.services
      .filter(service => service.isAvailable)
      .map(service => `${service.name}: ${service.description}`)
      .join('\n');
    
    const policies = this.hotelInfo.policies
      .filter(policy => policy.isActive)
      .map(policy => `${policy.title}: ${policy.description}`)
      .join('\n');

    return `Hotel Information:
- Name: ${this.hotelInfo.name}
- Location: ${this.hotelInfo.location}
- Phone: ${this.hotelInfo.contactInfo.phone}
- Email: ${this.hotelInfo.contactInfo.email}
- Address: ${this.hotelInfo.contactInfo.address}

Amenities: ${amenities}

Services:
${services}

Policies:
${policies}`;
  }

  private buildGuestContext(conversation: Conversation): string {
    if (!conversation.context.guestInfo) {
      return 'Guest information not available.';
    }

    const guest = conversation.context.guestInfo;
    return `Guest Information:
- Name: ${guest.name}
- Room Number: ${guest.roomNumber}
- Check-in: ${guest.checkInDate}
- Check-out: ${guest.checkOutDate}
- Preferences: ${guest.preferences?.join(', ') || 'None specified'}`;
  }

  private buildConversationContext(history: ConversationMessage[]): string {
    if (!history || history.length === 0) {
      return 'No previous conversation history.';
    }

    const contextMessages = history
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Recent conversation history:\n${contextMessages}`;
  }

  private buildIntentContext(intentMatch?: IntentMatch): string {
    if (!intentMatch) {
      return 'No specific intent detected.';
    }

    return `Detected Intent: ${intentMatch.intent.name}
Confidence: ${intentMatch.confidence}
Category: ${intentMatch.intent.category}
Description: ${intentMatch.intent.description}`;
  }

  private buildDefaultPrompt(
    message: ConversationMessage,
    conversation: Conversation,
    conversationHistory: ConversationMessage[]
  ): string {
    const systemContext = this.buildSystemContext();
    const hotelContext = this.buildHotelContext();
    const guestContext = this.buildGuestContext(conversation);
    const conversationContext = this.buildConversationContext(conversationHistory);

    return `${systemContext}

${hotelContext}

${guestContext}

${conversationContext}

Guest message: ${message.content}

Please provide a helpful response to the guest. If you need to perform any actions (like creating a service request or booking), respond with structured JSON that includes the action to take.`;
  }

  public updateHotelInfo(hotelInfo: HotelInfo): void {
    this.hotelInfo = hotelInfo;
    logger.info('Hotel information updated in prompt builder');
  }

  public addPromptTemplate(template: PromptTemplate): void {
    this.promptTemplates.set(template.name, template);
    logger.info('Prompt template added', { templateName: template.name });
  }

  public getAvailableTemplates(): string[] {
    return Array.from(this.promptTemplates.keys());
  }
}
