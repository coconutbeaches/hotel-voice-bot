import { wahaClient } from '../services/whatsapp/wahaClient.js';
import { messageQueue } from '../services/whatsapp/messageQueue.js';
import { templateService } from '../services/whatsapp/templateService.js';
import { logger } from '../utils/logger.js';

async function testWhatsAppIntegration() {
  try {
    logger.info('Testing WAHA WhatsApp integration...');

    // Test 1: Check WAHA session status
    logger.info('Test 1: Checking WAHA session status...');
    const sessionStatus = await wahaClient.getSessionStatus();
    logger.info('Session status:', sessionStatus);

    if (sessionStatus.status !== 'WORKING') {
      logger.error('WAHA session is not working. Please set up the session first.');
      return;
    }

    // Test 2: Send a simple text message
    logger.info('Test 2: Sending text message...');
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '1234567890';
    const result = await wahaClient.sendTextMessage(testPhoneNumber, 'Hello from WAHA integration test!');
    logger.info('Text message sent:', result);

    // Test 3: Send a message with buttons
    logger.info('Test 3: Sending message with buttons...');
    const buttonResult = await wahaClient.sendButtonsMessage(
      testPhoneNumber,
      'Choose an option:',
      [
        { id: 'option1', text: 'Option 1' },
        { id: 'option2', text: 'Option 2' }
      ]
    );
    logger.info('Button message sent:', buttonResult);

    // Test 4: Test message queue
    logger.info('Test 4: Testing message queue...');
    const jobId = await messageQueue.enqueueMessage(
      testPhoneNumber,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: testPhoneNumber,
        type: 'text',
        text: {
          body: 'Message from queue test'
        }
      },
      'normal'
    );
    logger.info('Message queued:', jobId);

    // Test 5: Test template service
    logger.info('Test 5: Testing template service...');
    await templateService.sendWelcomeMessage(
      testPhoneNumber,
      'Test Guest',
      '101',
      '2024-01-15',
      '2024-01-17'
    );
    logger.info('Welcome message sent via template service');

    // Test 6: Get queue statistics
    logger.info('Test 6: Getting queue statistics...');
    const stats = await messageQueue.getQueueStats();
    logger.info('Queue statistics:', stats);

    logger.info('All tests completed successfully!');

  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWhatsAppIntegration();
}

export { testWhatsAppIntegration };
