import { 
  ConversationMessage, 
  Conversation, 
  LLMResponse, 
  IntentMatch,
  PromptTemplate,
  FunctionCall,
  HotelInfo 
} from '@hotel-voice-bot/shared';
// TODO: Re-enable OpenAI integration
// import { OpenAIClient } from '@hotel-voice-bot/integrations';
import { IntentRouter } from './intentRouter.js';
import { PromptBuilder } from './promptBuilder.js';
import { FunctionCallHandler } from './functionCallHandler.js';
import { EscalationHandler } from './escalationHandler.js';
import { ConversationMemory } from './conversationMemory.js';
import { logger } from '../../utils/logger.js';

export class NLPController {
  private intentRouter: IntentRouter;
  private promptBuilder: PromptBuilder;
  private functionCallHandler: FunctionCallHandler;
  private escalationHandler: EscalationHandler;
  private conversationMemory: ConversationMemory;
  private openaiClient: any; // OpenAI client stub

  constructor(
    intents: any[],
    promptTemplates: PromptTemplate[],
    hotelInfo: HotelInfo
  ) {
    this.intentRouter = new IntentRouter(intents);
    this.promptBuilder = new PromptBuilder(promptTemplates, hotelInfo);
    this.functionCallHandler = new FunctionCallHandler();
    this.escalationHandler = new EscalationHandler();
    this.conversationMemory = new ConversationMemory();
    // TODO: Re-enable OpenAI integration
    this.openaiClient = null;
  }

  public async processMessage(
    message: ConversationMessage,
    conversation: Conversation
  ): Promise<LLMResponse> {
    try {
      logger.info('Processing message', { 
        messageId: message.id, 
        conversationId: conversation.id 
      });

      // Step 1: Match intent
      const intentMatches: IntentMatch[] = this.intentRouter.matchIntent(message);
      const topIntent = intentMatches[0];

      // Step 2: Update conversation context
      if (topIntent) {
        conversation.context.currentIntent = topIntent.intent.name;
        conversation.context.extractedEntities = topIntent.extractedEntities;
      }

      // Step 3: Get conversation history
      const conversationHistory = await this.conversationMemory.getHistory(
        conversation.id,
        10 // Last 10 messages
      );

      // Step 4: Build prompt with context
      const prompt = await this.promptBuilder.buildPrompt(
        message,
        conversation,
        conversationHistory,
        topIntent
      );

      // Step 5: Generate LLM response
      const llmResponse = await this.generateResponse(prompt, conversation);

      // Step 6: Check for escalation
      const shouldEscalate = await this.escalationHandler.shouldEscalate(
        message,
        conversation,
        llmResponse
      );

      if (shouldEscalate.shouldEscalate) {
        llmResponse.shouldEscalate = true;
        llmResponse.escalationReason = shouldEscalate.reason;
      }

      // Step 7: Handle function calls if present
      if (llmResponse.functionCalls && llmResponse.functionCalls.length > 0) {
        const functionResults = await this.functionCallHandler.handleFunctionCalls(
          llmResponse.functionCalls,
          conversation
        );
        llmResponse.metadata = { functionResults };
      }

      logger.info('Message processed successfully', {
        messageId: message.id,
        intent: topIntent?.intent.name,
        confidence: topIntent?.confidence,
        shouldEscalate: llmResponse.shouldEscalate
      });

      return llmResponse;
    } catch (error) {
      logger.error('Error processing message', { 
        messageId: message.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        content: 'I apologize, but I encountered an error processing your message. Please try again or contact our staff directly.',
        shouldEscalate: true,
        escalationReason: 'system_error'
      };
    }
  }

  private async generateResponse(
    prompt: string,
    conversation: Conversation
  ): Promise<LLMResponse> {
    try {
      // TODO: Re-enable OpenAI integration
      if (!this.openaiClient) {
        logger.warn('OpenAI client not available, returning fallback response');
        return {
          content: 'I apologize, but I\'m currently unable to process your request. Please contact our staff directly for assistance.',
          shouldEscalate: true,
          escalationReason: 'openai_unavailable'
        };
      }
      
      const response = await this.openaiClient.generateResponse(prompt);
      
      // Parse response for structured output
      const parsedResponse = this.parseStructuredResponse(response);
      
      return {
        content: parsedResponse.content || response,
        intent: parsedResponse.intent,
        confidence: parsedResponse.confidence,
        functionCalls: parsedResponse.functionCalls,
        shouldEscalate: parsedResponse.shouldEscalate,
        escalationReason: parsedResponse.escalationReason,
        metadata: parsedResponse.metadata
      };
    } catch (error) {
      logger.error('Error generating LLM response', { 
        conversationId: conversation.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      throw error;
    }
  }

  private parseStructuredResponse(response: string): Partial<LLMResponse> {
    try {
      // Try to parse as JSON first (for structured responses)
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // If not JSON, treat as plain text response
      return {
        content: response
      };
    }
  }

  public async updateIntent(intentId: string, intent: any): Promise<void> {
    // Update intent in the router
    // This would typically update the database and reload intents
    logger.info('Intent updated', { intentId });
  }

  public async reloadIntents(): Promise<void> {
    // Reload intents from database
    // This would typically be called when intents are updated
    logger.info('Intents reloaded');
  }
}
