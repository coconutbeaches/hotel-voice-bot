import { IntentRouter } from '../intentRouter';
import { ConversationMessage, Intent } from '@hotel-voice-bot/shared';

describe('IntentRouter', () => {
  let intents: Intent[];
  let intentRouter: IntentRouter;

  beforeEach(() => {
    intents = [
      { id: '1', name: 'Booking', keywords: ['book', 'reservation'], patterns: [], handler: '', category: 'booking', description: '', priority: 1, isActive: true, examples: [] },
      { id: '2', name: 'ServiceRequest', keywords: ['room service', 'housekeeping'], patterns: [], handler: '', category: 'service_request', description: '', priority: 1, isActive: true, examples: [] }
    ];
    intentRouter = new IntentRouter(intents);
  });

  it('should match Booking intent based on keywords', () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'I want to book a room',
      timestamp: '',
    };

    const matches = intentRouter.matchIntent(message);
    expect(matches.length).toBe(1);
    expect(matches[0].intent.name).toBe('Booking');
  });

  it('should match ServiceRequest intent based on keywords', () => {
    const message: ConversationMessage = {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Can I have room service?',
      timestamp: '',
    };

    const matches = intentRouter.matchIntent(message);
    expect(matches.length).toBe(1);
    expect(matches[0].intent.name).toBe('ServiceRequest');
  });

  it('should return empty matches for unknown keywords', () => {
    const message: ConversationMessage = {
      id: 'msg-3',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello there!',
      timestamp: '',
    };

    const matches = intentRouter.matchIntent(message);
    expect(matches.length).toBe(0);
  });
});

