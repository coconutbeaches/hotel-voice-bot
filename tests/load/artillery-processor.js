const fs = require('fs');
const path = require('path');

// Conversation patterns for realistic testing
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
  ],
  [
    'Good evening, I need to report a noise complaint',
    'The room next door is very loud',
    'Can you please ask them to quiet down?',
    'Thank you for handling this',
    'Much better now'
  ],
  [
    'Hello, I need help with the WiFi',
    'The password is not working',
    'Can you reset it for me?',
    'What is the new password?',
    'Perfect, it works now'
  ],
  [
    'Hi, I need to cancel my spa appointment',
    'It was scheduled for 2 PM today',
    'Can you reschedule it for tomorrow?',
    'Yes, 3 PM tomorrow works',
    'Thank you'
  ]
];

// Media types for testing
const mediaTypes = [
  {
    type: 'image',
    hasMedia: true,
    mediaUrl: 'https://example.com/image.jpg',
    mimeType: 'image/jpeg',
    body: 'Image message'
  },
  {
    type: 'audio',
    hasMedia: true,
    mediaUrl: 'https://example.com/audio.mp3',
    mimeType: 'audio/mpeg',
    body: ''
  },
  {
    type: 'document',
    hasMedia: true,
    mediaUrl: 'https://example.com/document.pdf',
    mimeType: 'application/pdf',
    body: 'Document message'
  },
  {
    type: 'video',
    hasMedia: true,
    mediaUrl: 'https://example.com/video.mp4',
    mimeType: 'video/mp4',
    body: 'Video message'
  }
];

// Metrics tracking
let messageCount = 0;
let conversationCount = 0;
let errorCount = 0;
let pmsIntegrationCount = 0;

// Utility functions
function generatePhoneNumber() {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTimestamp() {
  return Date.now();
}

// Processor functions
function setupTestEnvironment(context, events, done) {
  console.log('Setting up test environment...');
  
  // Initialize metrics
  messageCount = 0;
  conversationCount = 0;
  errorCount = 0;
  pmsIntegrationCount = 0;
  
  // Load test data if available
  try {
    const testDataPath = path.join(__dirname, 'test-data');
    if (fs.existsSync(testDataPath)) {
      console.log('Loading test data...');
      // Load any additional test data here
    }
  } catch (error) {
    console.warn('Could not load test data:', error.message);
  }
  
  return done();
}

function cleanupTestEnvironment(context, events, done) {
  console.log('Cleaning up test environment...');
  console.log(`Total messages processed: ${messageCount}`);
  console.log(`Total conversations: ${conversationCount}`);
  console.log(`Total errors: ${errorCount}`);
  console.log(`PMS integration calls: ${pmsIntegrationCount}`);
  
  return done();
}

function generatePhoneNumber(context, events, done) {
  context.vars.phoneNumber = generatePhoneNumber();
  context.vars.messageId = generateMessageId();
  context.vars.timestamp = generateTimestamp();
  
  return done();
}

function selectConversationPattern(context, events, done) {
  const pattern = conversationPatterns[Math.floor(Math.random() * conversationPatterns.length)];
  context.vars.conversationPattern = pattern;
  context.vars.conversationLength = pattern.length;
  context.vars.currentMessageIndex = 0;
  
  conversationCount++;
  
  return done();
}

function selectMediaType(context, events, done) {
  const mediaType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
  context.vars.mediaType = mediaType.type;
  context.vars.hasMedia = mediaType.hasMedia;
  context.vars.mediaUrl = mediaType.mediaUrl;
  context.vars.mimeType = mediaType.mimeType;
  context.vars.messageBody = mediaType.body;
  context.vars.messageId = generateMessageId();
  context.vars.timestamp = generateTimestamp();
  
  return done();
}

function prepareWebhookMessage(requestParams, context, events, done) {
  const pattern = context.vars.conversationPattern;
  const index = context.vars.currentMessageIndex || 0;
  
  if (pattern && index < pattern.length) {
    context.vars.messageBody = pattern[index];
    context.vars.currentMessageIndex = index + 1;
  } else {
    context.vars.messageBody = `Random message ${Math.floor(Math.random() * 1000)}`;
  }
  
  context.vars.messageId = generateMessageId();
  context.vars.timestamp = generateTimestamp();
  
  messageCount++;
  
  return done();
}

function prepareMediaMessage(requestParams, context, events, done) {
  context.vars.messageId = generateMessageId();
  context.vars.timestamp = generateTimestamp();
  
  messageCount++;
  
  return done();
}

function prepareRapidMessage(requestParams, context, events, done) {
  context.vars.messageBody = `Rapid message ${Math.floor(Math.random() * 1000)}`;
  context.vars.messageId = generateMessageId();
  context.vars.timestamp = generateTimestamp();
  
  messageCount++;
  
  return done();
}

function simulatePMSIntegration(context, events, done) {
  // Simulate PMS integration call
  const http = require('http');
  const url = require('url');
  
  const baseUrl = context.vars.target || 'http://localhost:3000';
  const phoneNumber = context.vars.phoneNumber;
  const apiKey = context.vars.pmsApiKey || 'test-pms-api-key';
  
  const requestUrl = `${baseUrl}/api/pms/guest/search?phone=${phoneNumber}`;
  const parsedUrl = url.parse(requestUrl);
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Artillery-LoadTest/1.0'
    },
    timeout: 10000
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      pmsIntegrationCount++;
      if (res.statusCode >= 400) {
        errorCount++;
      }
      return done();
    });
  });
  
  req.on('error', (error) => {
    console.error('PMS integration error:', error.message);
    errorCount++;
    return done();
  });
  
  req.on('timeout', () => {
    console.error('PMS integration timeout');
    errorCount++;
    req.destroy();
    return done();
  });
  
  req.end();
}

// Error handling
function handleError(context, events, done) {
  errorCount++;
  console.error('Request error:', context.vars.error);
  return done();
}

// Request/response logging
function logRequest(requestParams, context, events, done) {
  if (process.env.DEBUG === 'true') {
    console.log('Request:', {
      method: requestParams.method,
      url: requestParams.url,
      body: requestParams.json || requestParams.body
    });
  }
  return done();
}

function logResponse(requestParams, response, context, events, done) {
  if (process.env.DEBUG === 'true') {
    console.log('Response:', {
      statusCode: response.statusCode,
      body: response.body,
      timing: response.timings
    });
  }
  
  if (response.statusCode >= 400) {
    errorCount++;
  }
  
  return done();
}

// Performance monitoring
function trackPerformance(context, events, done) {
  const startTime = Date.now();
  
  context.vars.performanceStartTime = startTime;
  
  return done();
}

function measurePerformance(requestParams, response, context, events, done) {
  const endTime = Date.now();
  const startTime = context.vars.performanceStartTime;
  
  if (startTime) {
    const duration = endTime - startTime;
    context.vars.requestDuration = duration;
    
    if (duration > 5000) { // Log slow requests
      console.warn(`Slow request detected: ${duration}ms`);
    }
  }
  
  return done();
}

// Export all functions
module.exports = {
  setupTestEnvironment,
  cleanupTestEnvironment,
  generatePhoneNumber,
  selectConversationPattern,
  selectMediaType,
  prepareWebhookMessage,
  prepareMediaMessage,
  prepareRapidMessage,
  simulatePMSIntegration,
  handleError,
  logRequest,
  logResponse,
  trackPerformance,
  measurePerformance
};
