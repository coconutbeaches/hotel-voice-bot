/// <reference types="cypress" />

import { WAHAMessage } from '../../../packages/api/src/services/whatsapp/wahaClient';

// Custom command declarations
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Send a WhatsApp webhook event
       */
      sendWhatsAppWebhook(message: Partial<WAHAMessage>): Chainable<any>;
      
      /**
       * Verify webhook response
       */
      verifyWebhookResponse(expectedStatus: number): Chainable<any>;
      
      /**
       * Wait for message processing
       */
      waitForMessageProcessing(messageId: string): Chainable<any>;
      
      /**
       * Setup test guest in PMS
       */
      setupTestGuest(guestData: any): Chainable<any>;
      
      /**
       * Cleanup test data
       */
      cleanupTestData(): Chainable<any>;
      
      /**
       * Verify PMS integration
       */
      verifyPMSIntegration(guestId: string): Chainable<any>;
      
      /**
       * Check API health
       */
      checkApiHealth(): Chainable<any>;
      
      /**
       * Simulate multiple concurrent messages
       */
      simulateConcurrentMessages(count: number, phoneNumber: string): Chainable<any>;
    }
  }
}

// Custom command implementations
Cypress.Commands.add('sendWhatsAppWebhook', (message: Partial<WAHAMessage>) => {
  const defaultMessage: WAHAMessage = {
    id: `msg_${Date.now()}`,
    timestamp: Date.now(),
    from: Cypress.env('TEST_PHONE_NUMBER'),
    body: 'Test message',
    type: 'text',
    fromMe: false,
    hasMedia: false,
    ...message
  };

  return cy.request({
    method: 'POST',
    url: `/api/whatsapp/webhook?token=${Cypress.env('WEBHOOK_TOKEN')}`,
    body: defaultMessage,
    failOnStatusCode: false
  });
});

Cypress.Commands.add('verifyWebhookResponse', (expectedStatus: number) => {
  return cy.wrap(null).then(() => {
    // Verify the webhook response
    cy.get('@webhookResponse').should('have.property', 'status', expectedStatus);
    
    if (expectedStatus === 200) {
      cy.get('@webhookResponse').its('body').should('eq', 'EVENT_RECEIVED');
    }
  });
});

Cypress.Commands.add('waitForMessageProcessing', (messageId: string) => {
  return cy.task('waitForWebhookProcessing', messageId);
});

Cypress.Commands.add('setupTestGuest', (guestData: any) => {
  const defaultGuestData = {
    id: `guest_${Date.now()}`,
    firstName: 'John',
    lastName: 'Doe',
    phone: Cypress.env('TEST_PHONE_NUMBER'),
    email: 'john.doe@example.com',
    roomNumber: '101',
    checkInDate: '2024-01-01',
    checkOutDate: '2024-01-03',
    ...guestData
  };

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('PMS_API_URL')}/guests`,
    headers: {
      'Authorization': `Bearer ${Cypress.env('PMS_SANDBOX_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: defaultGuestData,
    failOnStatusCode: false
  });
});

Cypress.Commands.add('cleanupTestData', () => {
  return cy.task('cleanupTestData');
});

Cypress.Commands.add('verifyPMSIntegration', (guestId: string) => {
  return cy.task('verifyPMSIntegration', guestId);
});

Cypress.Commands.add('checkApiHealth', () => {
  return cy.request({
    method: 'GET',
    url: '/api/health',
    failOnStatusCode: false
  });
});

Cypress.Commands.add('simulateConcurrentMessages', (count: number, phoneNumber: string) => {
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(
      cy.sendWhatsAppWebhook({
        id: `msg_${Date.now()}_${i}`,
        from: phoneNumber,
        body: `Test message ${i + 1}`,
        timestamp: Date.now()
      })
    );
  }
  
  return cy.wrap(Promise.all(promises));
});

// Helper functions
export const generatePhoneNumber = () => {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
};

export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createTestMessage = (overrides: Partial<WAHAMessage> = {}): WAHAMessage => {
  return {
    id: generateMessageId(),
    timestamp: Date.now(),
    from: generatePhoneNumber(),
    body: 'Test message',
    type: 'text',
    fromMe: false,
    hasMedia: false,
    ...overrides
  };
};

export const webhookPayloads = {
  textMessage: {
    id: 'msg_text_001',
    timestamp: Date.now(),
    from: '+1234567890@c.us',
    body: 'Hello, I need help with room service',
    type: 'text' as const,
    fromMe: false,
    hasMedia: false
  },
  
  imageMessage: {
    id: 'msg_image_001',
    timestamp: Date.now(),
    from: '+1234567890@c.us',
    body: 'Image caption',
    type: 'image' as const,
    fromMe: false,
    hasMedia: true,
    mediaUrl: 'https://example.com/image.jpg',
    mimeType: 'image/jpeg'
  },
  
  audioMessage: {
    id: 'msg_audio_001',
    timestamp: Date.now(),
    from: '+1234567890@c.us',
    body: '',
    type: 'audio' as const,
    fromMe: false,
    hasMedia: true,
    mediaUrl: 'https://example.com/audio.mp3',
    mimeType: 'audio/mpeg'
  },
  
  documentMessage: {
    id: 'msg_doc_001',
    timestamp: Date.now(),
    from: '+1234567890@c.us',
    body: 'Receipt',
    type: 'document' as const,
    fromMe: false,
    hasMedia: true,
    mediaUrl: 'https://example.com/receipt.pdf',
    mimeType: 'application/pdf'
  }
};
