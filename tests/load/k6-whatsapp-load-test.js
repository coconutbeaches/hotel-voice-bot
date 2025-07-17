import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const webhookSuccessRate = new Rate('webhook_success_rate');
const webhookLatency = new Trend('webhook_latency');
const concurrentChats = new Counter('concurrent_chats');
const messagesProcessed = new Counter('messages_processed');
const apiErrors = new Counter('api_errors');
const pmsIntegrationLatency = new Trend('pms_integration_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WEBHOOK_TOKEN = __ENV.WEBHOOK_TOKEN || 'test-webhook-token';
const CONCURRENT_USERS = __ENV.CONCURRENT_USERS || 1000;
const TEST_DURATION = __ENV.TEST_DURATION || '30s';
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || '10s';
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || '5s';

// Test configuration
export const options = {
  stages: [
    { duration: RAMP_UP_DURATION, target: CONCURRENT_USERS },
    { duration: TEST_DURATION, target: CONCURRENT_USERS },
    { duration: RAMP_DOWN_DURATION, target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'], // Error rate must be less than 1%
    webhook_success_rate: ['rate>0.99'], // Webhook success rate must be above 99%
    webhook_latency: ['p(95)<1000'], // 95% of webhook calls must complete below 1s
    concurrent_chats: ['count>500'], // Must handle at least 500 concurrent chats
    messages_processed: ['count>10000'], // Must process at least 10,000 messages
    api_errors: ['count<100'], // API errors must be less than 100
    pms_integration_latency: ['p(95)<3000'], // PMS integration latency must be below 3s
  },
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// Test data generators
function generatePhoneNumber() {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTestMessage(phoneNumber, messageType = 'text') {
  const baseMessage = {
    id: generateMessageId(),
    timestamp: Date.now(),
    from: `${phoneNumber}@c.us`,
    fromMe: false,
    hasMedia: false,
  };

  switch (messageType) {
    case 'text':
      return {
        ...baseMessage,
        body: `Test message ${Math.floor(Math.random() * 1000)}`,
        type: 'text',
      };
    case 'image':
      return {
        ...baseMessage,
        body: 'Image message',
        type: 'image',
        hasMedia: true,
        mediaUrl: 'https://example.com/image.jpg',
        mimeType: 'image/jpeg',
      };
    case 'audio':
      return {
        ...baseMessage,
        body: '',
        type: 'audio',
        hasMedia: true,
        mediaUrl: 'https://example.com/audio.mp3',
        mimeType: 'audio/mpeg',
      };
    case 'document':
      return {
        ...baseMessage,
        body: 'Document message',
        type: 'document',
        hasMedia: true,
        mediaUrl: 'https://example.com/document.pdf',
        mimeType: 'application/pdf',
      };
    default:
      return baseMessage;
  }
}

// Conversation patterns
const conversationPatterns = [
  [
    'Hello, I need help with room service',
    'Can you show me the menu?',
    'I would like to order a burger',
    'What is the delivery time?',
    'Please place the order'
  ],
  [
    'Hi, what time is checkout?',
    'Can I extend my stay?',
    'How much would it cost?',
    'Yes, please extend until tomorrow',
    'Thank you'
  ],
  [
    'Good morning, I have a problem with my room',
    'The air conditioning is not working',
    'Can you send someone to fix it?',
    'How long will it take?',
    'Thank you for your help'
  ],
  [
    'Hello, I need information about hotel amenities',
    'Do you have a spa?',
    'What are the operating hours?',
    'How can I make a reservation?',
    'Perfect, please book me for 3 PM'
  ],
  [
    'Hi, I lost my key card',
    'I am in room 205',
    'Can you send someone to help?',
    'I will wait at the front desk',
    'Thank you'
  ]
];

// Test scenarios
export default function() {
  const phoneNumber = generatePhoneNumber();
  const conversationPattern = conversationPatterns[Math.floor(Math.random() * conversationPatterns.length)];
  
  // Simulate a conversation
  for (let i = 0; i < conversationPattern.length; i++) {
    const message = generateTestMessage(phoneNumber, 'text');
    message.body = conversationPattern[i];
    
    const startTime = Date.now();
    
    // Send webhook message
    const response = http.post(
      `${BASE_URL}/api/whatsapp/webhook?token=${WEBHOOK_TOKEN}`,
      JSON.stringify(message),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: '30s',
      }
    );
    
    const success = check(response, {
      'webhook response is 200': (r) => r.status === 200,
      'webhook response is EVENT_RECEIVED': (r) => r.body === 'EVENT_RECEIVED',
      'webhook response time < 5s': (r) => r.timings.duration < 5000,
    });
    
    // Record metrics
    webhookSuccessRate.add(success);
    webhookLatency.add(response.timings.duration);
    messagesProcessed.add(1);
    
    if (!success) {
      apiErrors.add(1);
    }
    
    if (i === 0) {
      concurrentChats.add(1);
    }
    
    // Random delay between messages in conversation
    sleep(Math.random() * 2 + 1); // 1-3 seconds between messages
  }
  
  // Simulate PMS integration call
  simulatePMSIntegration();
  
  // Random delay between conversations
  sleep(Math.random() * 5 + 2); // 2-7 seconds between conversations
}

function simulatePMSIntegration() {
  const pmsStartTime = Date.now();
  
  // Simulate guest lookup
  const guestResponse = http.get(`${BASE_URL}/api/pms/guest/search?phone=${generatePhoneNumber()}`, {
    headers: {
      'Authorization': 'Bearer test-token',
    },
    timeout: '10s',
  });
  
  const pmsSuccess = check(guestResponse, {
    'PMS integration response is valid': (r) => r.status === 200 || r.status === 404,
    'PMS integration response time < 10s': (r) => r.timings.duration < 10000,
  });
  
  pmsIntegrationLatency.add(guestResponse.timings.duration);
  
  if (!pmsSuccess) {
    apiErrors.add(1);
  }
}

// Test scenarios for different message types
export function testMediaMessages() {
  const phoneNumber = generatePhoneNumber();
  const messageTypes = ['text', 'image', 'audio', 'document'];
  
  messageTypes.forEach(type => {
    const message = generateTestMessage(phoneNumber, type);
    
    const response = http.post(
      `${BASE_URL}/api/whatsapp/webhook?token=${WEBHOOK_TOKEN}`,
      JSON.stringify(message),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: '30s',
      }
    );
    
    const success = check(response, {
      [`${type} message processed successfully`]: (r) => r.status === 200,
    });
    
    webhookSuccessRate.add(success);
    messagesProcessed.add(1);
    
    if (!success) {
      apiErrors.add(1);
    }
  });
}

// Stress test scenario
export function stressTest() {
  const phoneNumber = generatePhoneNumber();
  const messageCount = 100;
  
  for (let i = 0; i < messageCount; i++) {
    const message = generateTestMessage(phoneNumber);
    message.body = `Stress test message ${i + 1}`;
    
    const response = http.post(
      `${BASE_URL}/api/whatsapp/webhook?token=${WEBHOOK_TOKEN}`,
      JSON.stringify(message),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: '30s',
      }
    );
    
    const success = check(response, {
      'stress test message processed': (r) => r.status === 200,
    });
    
    webhookSuccessRate.add(success);
    messagesProcessed.add(1);
    
    if (!success) {
      apiErrors.add(1);
    }
  }
}

// Error handling test
export function errorHandlingTest() {
  const phoneNumber = generatePhoneNumber();
  
  // Test with invalid payload
  const invalidResponse = http.post(
    `${BASE_URL}/api/whatsapp/webhook?token=${WEBHOOK_TOKEN}`,
    'invalid json',
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '30s',
    }
  );
  
  check(invalidResponse, {
    'invalid payload handled gracefully': (r) => r.status >= 400 && r.status < 500,
  });
  
  // Test with invalid token
  const invalidTokenResponse = http.post(
    `${BASE_URL}/api/whatsapp/webhook?token=invalid-token`,
    JSON.stringify(generateTestMessage(phoneNumber)),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '30s',
    }
  );
  
  check(invalidTokenResponse, {
    'invalid token rejected': (r) => r.status === 403,
  });
}

// Test setup and teardown
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: ${CONCURRENT_USERS} concurrent users`);
  console.log(`Duration: ${TEST_DURATION}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`API health check failed: ${healthResponse.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const endTime = Date.now();
  const duration = (endTime - data.startTime) / 1000;
  
  console.log(`Load test completed in ${duration} seconds`);
  console.log('Check the metrics for detailed results');
}
