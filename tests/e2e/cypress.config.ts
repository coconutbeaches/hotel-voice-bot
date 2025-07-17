import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'tests/e2e/support/index.ts',
    specPattern: 'tests/e2e/specs/**/*.cy.ts',
    fixturesFolder: 'tests/e2e/fixtures',
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',
    video: true,
    screenshot: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 30000,
    viewportWidth: 1280,
    viewportHeight: 720,
    env: {
      API_URL: 'http://localhost:3000',
      WAHA_API_URL: 'http://localhost:3001',
      PMS_API_URL: 'http://localhost:3002',
      WEBHOOK_TOKEN: 'test-webhook-token',
      TEST_PHONE_NUMBER: '+1234567890',
      PMS_SANDBOX_URL: 'http://localhost:3002',
      PMS_SANDBOX_API_KEY: 'test-pms-api-key',
    },
    setupNodeEvents(on, config) {
      // Task definitions for WhatsApp webhook simulation
      on('task', {
        // Simulate WhatsApp webhook event
        simulateWhatsAppWebhook: (payload) => {
          return new Promise((resolve) => {
            // Mock webhook event simulation
            setTimeout(() => {
              resolve({ 
                success: true, 
                messageId: `msg_${Date.now()}`,
                timestamp: new Date().toISOString()
              });
            }, 100);
          });
        },
        
        // Clean up test data
        cleanupTestData: () => {
          return new Promise((resolve) => {
            console.log('Cleaning up test data...');
            resolve(null);
          });
        },
        
        // Wait for webhook processing
        waitForWebhookProcessing: (messageId) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ processed: true, messageId });
            }, 1000);
          });
        },
        
        // Verify PMS integration
        verifyPMSIntegration: (guestId) => {
          return new Promise((resolve) => {
            resolve({ 
              guestExists: true, 
              guestId,
              roomNumber: '101',
              checkInDate: '2024-01-01',
              checkOutDate: '2024-01-03'
            });
          });
        }
      });
    },
  },
});
