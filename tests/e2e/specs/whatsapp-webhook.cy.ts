/// <reference types="cypress" />

import { webhookPayloads, generatePhoneNumber, createTestMessage } from '../support/commands';

describe('WhatsApp Webhook Events', () => {
  beforeEach(() => {
    // Check API health before each test
    cy.checkApiHealth().then((response) => {
      expect(response.status).to.equal(200);
    });
  });

  afterEach(() => {
    // Cleanup test data after each test
    cy.cleanupTestData();
  });

  describe('Webhook Token Verification', () => {
    it('should verify valid webhook token', () => {
      cy.request({
        method: 'GET',
        url: `/api/whatsapp/webhook?token=${Cypress.env('WEBHOOK_TOKEN')}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('Token verified');
      });
    });

    it('should reject invalid webhook token', () => {
      cy.request({
        method: 'GET',
        url: '/api/whatsapp/webhook?token=invalid-token',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(403);
        expect(response.body).to.equal('Verification failed');
      });
    });
  });

  describe('Text Message Processing', () => {
    it('should process text message webhook successfully', () => {
      const message = webhookPayloads.textMessage;
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should handle empty message body', () => {
      const message = createTestMessage({ body: '' });
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should handle special characters in message', () => {
      const message = createTestMessage({ 
        body: 'Hello! 🏨 I need help with émojis and spëcial characters' 
      });
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(4000); // 4KB message
      const message = createTestMessage({ body: longMessage });
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });
  });

  describe('Media Message Processing', () => {
    it('should process image message webhook', () => {
      const message = webhookPayloads.imageMessage;
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should process audio message webhook', () => {
      const message = webhookPayloads.audioMessage;
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should process document message webhook', () => {
      const message = webhookPayloads.documentMessage;
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed webhook payload', () => {
      cy.request({
        method: 'POST',
        url: `/api/whatsapp/webhook?token=${Cypress.env('WEBHOOK_TOKEN')}`,
        body: { invalid: 'payload' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should handle missing required fields', () => {
      const incompleteMessage = {
        id: 'msg_incomplete',
        // Missing required fields
      };
      
      cy.request({
        method: 'POST',
        url: `/api/whatsapp/webhook?token=${Cypress.env('WEBHOOK_TOKEN')}`,
        body: incompleteMessage,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });

    it('should handle invalid JSON payload', () => {
      cy.request({
        method: 'POST',
        url: `/api/whatsapp/webhook?token=${Cypress.env('WEBHOOK_TOKEN')}`,
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.within(400, 500);
      });
    });
  });

  describe('Concurrent Message Processing', () => {
    it('should handle multiple concurrent messages', () => {
      const phoneNumber = generatePhoneNumber();
      const concurrentMessages = 10;
      
      cy.simulateConcurrentMessages(concurrentMessages, phoneNumber).then((responses) => {
        expect(responses).to.have.length(concurrentMessages);
        responses.forEach((response: any) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.equal('EVENT_RECEIVED');
        });
      });
    });

    it('should handle messages from different phone numbers', () => {
      const messages = Array.from({ length: 5 }, (_, i) => 
        createTestMessage({
          from: generatePhoneNumber(),
          body: `Message ${i + 1}`
        })
      );
      
      const requests = messages.map(message => 
        cy.sendWhatsAppWebhook(message)
      );
      
      cy.wrap(Promise.all(requests)).then((responses) => {
        responses.forEach((response: any) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.equal('EVENT_RECEIVED');
        });
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle burst of messages within rate limit', () => {
      const phoneNumber = generatePhoneNumber();
      const burstSize = 20;
      
      // Send burst of messages
      const promises = [];
      for (let i = 0; i < burstSize; i++) {
        promises.push(
          cy.sendWhatsAppWebhook({
            id: `msg_burst_${i}`,
            from: phoneNumber,
            body: `Burst message ${i + 1}`,
            timestamp: Date.now()
          })
        );
      }
      
      cy.wrap(Promise.all(promises)).then((responses) => {
        // All messages should be processed successfully
        responses.forEach((response: any) => {
          expect(response.status).to.equal(200);
        });
      });
    });
  });

  describe('Message Delivery Status', () => {
    it('should handle message delivery status updates', () => {
      const statusUpdate = {
        id: 'msg_status_001',
        timestamp: Date.now(),
        from: generatePhoneNumber(),
        body: 'Status update message',
        type: 'text' as const,
        fromMe: false,
        hasMedia: false
      };
      
      cy.sendWhatsAppWebhook(statusUpdate).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.equal('EVENT_RECEIVED');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with PMS system for guest lookup', () => {
      const testGuest = {
        id: `guest_${Date.now()}`,
        firstName: 'Test',
        lastName: 'Guest',
        phone: generatePhoneNumber(),
        roomNumber: '101'
      };
      
      // Setup test guest in PMS
      cy.setupTestGuest(testGuest).then((guestResponse) => {
        expect(guestResponse.status).to.be.within(200, 201);
        
        // Send message from guest's phone
        const message = createTestMessage({
          from: testGuest.phone,
          body: 'I need room service'
        });
        
        cy.sendWhatsAppWebhook(message).then((webhookResponse) => {
          expect(webhookResponse.status).to.equal(200);
          
          // Verify PMS integration
          cy.verifyPMSIntegration(testGuest.id).then((verification) => {
            expect(verification).to.have.property('guestExists', true);
            expect(verification).to.have.property('guestId', testGuest.id);
          });
        });
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', () => {
      const message = createTestMessage();
      const startTime = Date.now();
      
      cy.sendWhatsAppWebhook(message).then((response) => {
        const responseTime = Date.now() - startTime;
        expect(response.status).to.equal(200);
        expect(responseTime).to.be.lessThan(5000); // Should respond within 5 seconds
      });
    });

    it('should handle high-frequency messages', () => {
      const phoneNumber = generatePhoneNumber();
      const messageCount = 50;
      const startTime = Date.now();
      
      // Send messages rapidly
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(
          cy.sendWhatsAppWebhook({
            id: `msg_rapid_${i}`,
            from: phoneNumber,
            body: `Rapid message ${i + 1}`,
            timestamp: Date.now()
          })
        );
      }
      
      cy.wrap(Promise.all(promises)).then((responses) => {
        const totalTime = Date.now() - startTime;
        const avgResponseTime = totalTime / messageCount;
        
        expect(responses).to.have.length(messageCount);
        expect(avgResponseTime).to.be.lessThan(1000); // Average under 1 second
        
        responses.forEach((response: any) => {
          expect(response.status).to.equal(200);
        });
      });
    });
  });
});
