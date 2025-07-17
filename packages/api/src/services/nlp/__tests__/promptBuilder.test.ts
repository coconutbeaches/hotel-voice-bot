import { PromptBuilder } from '../promptBuilder';
import { ConversationMessage, Conversation, PromptTemplate, HotelInfo, HotelGuest } from '@hotel-voice-bot/shared';

describe('PromptBuilder', () => {
  let promptBuilder: PromptBuilder;
  let hotelInfo: HotelInfo;
  let promptTemplates: PromptTemplate[];

  beforeEach(() => {
    hotelInfo = {
      id: 'hotel-1',
      name: 'Test Hotel',
      location: 'Test City',
      amenities: ['WiFi', 'Pool', 'Gym'],
      policies: [
        { id: 'policy-1', category: 'general', title: 'Check-in', description: 'Check-in at 3 PM', isActive: true }
      ],
      contactInfo: {
        phone: '555-0123',
        email: 'info@testhotel.com',
        address: '123 Test Street'
      },
      services: [
        { id: 'service-1', name: 'Room Service', description: 'Available 24/7', category: 'room_service', isAvailable: true, hours: '24/7' }
      ]
    };

    promptTemplates = [
      {
        id: 'template-1',
        name: 'default_conversation',
        template: '{{SYSTEM_CONTEXT}}\n\n{{HOTEL_CONTEXT}}\n\nUser: {{USER_MESSAGE}}',
        variables: ['SYSTEM_CONTEXT', 'HOTEL_CONTEXT', 'USER_MESSAGE'],
        category: 'system',
        isActive: true,
        version: '1.0'
      }
    ];

    promptBuilder = new PromptBuilder(promptTemplates, hotelInfo);
  });

  it('should build a basic prompt with hotel context', async () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'What are your amenities?',
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

    const prompt = await promptBuilder.buildPrompt(message, conversation, []);
    
    expect(prompt).toContain('Test Hotel');
    expect(prompt).toContain('WiFi, Pool, Gym');
    expect(prompt).toContain('What are your amenities?');
  });

  it('should include guest information when available', async () => {
    const guest: HotelGuest = {
      id: 'guest-1',
      name: 'John Doe',
      phoneNumber: '+1234567890',
      roomNumber: '101',
      checkInDate: '2024-01-01',
      checkOutDate: '2024-01-03',
      preferences: ['quiet room']
    };

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
        guestInfo: guest,
        isEscalated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    const prompt = await promptBuilder.buildPrompt(message, conversation, []);
    
    expect(prompt).toContain('John Doe');
    expect(prompt).toContain('Room Number: 101');
    expect(prompt).toContain('quiet room');
  });

  it('should handle missing template gracefully', async () => {
    const emptyPromptBuilder = new PromptBuilder([], hotelInfo);
    
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

    const prompt = await emptyPromptBuilder.buildPrompt(message, conversation, []);
    
    expect(prompt).toContain('Hello');
    expect(prompt).toContain('Test Hotel');
  });

  it('should include conversation history when provided', async () => {
    const history: ConversationMessage[] = [
      {
        id: 'msg-0',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Previous message',
        timestamp: new Date().toISOString()
      }
    ];

    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Current message',
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

    const prompt = await promptBuilder.buildPrompt(message, conversation, history);
    
    expect(prompt).toContain('Previous message');
    expect(prompt).toContain('Current message');
  });
});
