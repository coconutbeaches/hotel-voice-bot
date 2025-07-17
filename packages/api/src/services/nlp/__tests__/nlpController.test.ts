import { NLPController } from '../nlpController';
import { ConversationMessage, Conversation, Intent, PromptTemplate, HotelInfo } from '@hotel-voice-bot/shared';
import { OpenAIClient } from '@hotel-voice-bot/integrations/openai';

// Mock the OpenAI client
jest.mock('@hotel-voice-bot/integrations/openai', () => ({
  OpenAIClient: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn()
  }))
}));

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock Supabase
jest.mock('@hotel-voice-bot/integrations/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('NLPController', () => {
  let nlpController: NLPController;
  let mockOpenAIClient: jest.Mocked<OpenAIClient>;
  let intents: Intent[];
  let promptTemplates: PromptTemplate[];
  let hotelInfo: HotelInfo;

  beforeEach(() => {
    // Setup mock data
    intents = [
      {
        id: '1',
        name: 'booking',
        description: 'Room booking intent',
        keywords: ['book', 'reservation'],
        patterns: [],
        category: 'booking',
        handler: 'bookingHandler',
        priority: 1,
        isActive: true,
        examples: []
      }
    ];

    promptTemplates = [
      {
        id: 'template-1',
        name: 'default_conversation',
        template: '{{SYSTEM_CONTEXT}}\n\nUser: {{USER_MESSAGE}}',
        variables: ['SYSTEM_CONTEXT', 'USER_MESSAGE'],
        category: 'system',
        isActive: true,
        version: '1.0'
      }
    ];

    hotelInfo = {
      id: 'hotel-1',
      name: 'Test Hotel',
      location: 'Test City',
      amenities: ['WiFi', 'Pool'],
      policies: [],
      contactInfo: {
        phone: '555-0123',
        email: 'info@testhotel.com',
        address: '123 Test Street'
      },
      services: []
    };

    // Setup OpenAI mock
    mockOpenAIClient = new OpenAIClient() as jest.Mocked<OpenAIClient>;
    mockOpenAIClient.generateResponse.mockResolvedValue('Mock response from AI');

    nlpController = new NLPController(intents, promptTemplates, hotelInfo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a message and return LLM response', async () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'I want to book a room',
      timestamp: new Date().toISOString()
    };

    const conversation: Conversation = {
      id: 'conv-1',
      phoneNumber: '+1234567890',
      status: 'active',
      context: {
        hotelInfo,
        isEscalated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    const result = await nlpController.processMessage(message, conversation);

    expect(result).toBeDefined();
    expect(result.content).toBe('Mock response from AI');
    expect(mockOpenAIClient.generateResponse).toHaveBeenCalledWith(
      expect.stringContaining('I want to book a room')
    );
  });

  it('should handle structured JSON response from LLM', async () => {
    const structuredResponse = JSON.stringify({
      content: 'I can help you book a room',
      intent: 'booking',
      confidence: 0.95,
      functionCalls: [
        { name: 'bookRoom', arguments: { guests: 2, nights: 3 } }
      ]
    });

    mockOpenAIClient.generateResponse.mockResolvedValue(structuredResponse);

    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Book a room for 2 guests for 3 nights',
      timestamp: new Date().toISOString()
    };

    const conversation: Conversation = {
      id: 'conv-1',
      phoneNumber: '+1234567890',
      status: 'active',
      context: {
        hotelInfo,
        isEscalated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    const result = await nlpController.processMessage(message, conversation);

    expect(result.content).toBe('I can help you book a room');
    expect(result.intent).toBe('booking');
    expect(result.confidence).toBe(0.95);
    expect(result.functionCalls).toHaveLength(1);
    expect(result.functionCalls?.[0].name).toBe('bookRoom');
  });

  it('should handle escalation based on message content', async () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'I want to speak to a manager',
      timestamp: new Date().toISOString()
    };

    const conversation: Conversation = {
      id: 'conv-1',
      phoneNumber: '+1234567890',
      status: 'active',
      context: {
        hotelInfo,
        isEscalated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    const result = await nlpController.processMessage(message, conversation);

    expect(result.shouldEscalate).toBe(true);
    expect(result.escalationReason).toBe('escalation_keywords');
  });

  it('should handle errors gracefully', async () => {
    mockOpenAIClient.generateResponse.mockRejectedValue(new Error('API Error'));

    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString()
    };

    const conversation: Conversation = {
      id: 'conv-1',
      phoneNumber: '+1234567890',
      status: 'active',
      context: {
        hotelInfo,
        isEscalated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    const result = await nlpController.processMessage(message, conversation);

    expect(result.shouldEscalate).toBe(true);
    expect(result.escalationReason).toBe('system_error');
    expect(result.content).toContain('I apologize, but I encountered an error');
  });

  it('should update conversation context with matched intent', async () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'I want to book a room',
      timestamp: new Date().toISOString()
    };

    const conversation: Conversation = {
      id: 'conv-1',
      phoneNumber: '+1234567890',
      status: 'active',
      context: {
        hotelInfo,
        isEscalated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    await nlpController.processMessage(message, conversation);

    expect(conversation.context.currentIntent).toBe('booking');
    expect(conversation.context.extractedEntities).toBeDefined();
  });
});
