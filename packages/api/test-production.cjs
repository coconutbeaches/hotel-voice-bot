// Test script to verify production mode behavior
const { spawn } = require('child_process');

console.log('Starting production mode test...\n');

const env = {
  ...process.env,
  NODE_ENV: 'production',
  WAHA_WEBHOOK_TOKEN: 'test-token',
  WAHA_API_URL: 'http://dummy-waha:3000',
  PORT: '3003',
  LOG_LEVEL: 'info'
};

const server = spawn('node', ['dist/index.js'], { env });

let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  output += data.toString();
  process.stderr.write(data);
});

// Let it run for 3 seconds then check results
setTimeout(() => {
  console.log('\n\n=== Test Results ===');
  
  if (output.includes('✅ WAHAClient initialized successfully - Real client used in production')) {
    console.log('✅ SUCCESS: Real WAHAClient was used in production mode');
  } else {
    console.log('❌ FAIL: Real WAHAClient was not used');
  }
  
  if (output.includes('Server running on port')) {
    console.log('✅ SUCCESS: Server started successfully');
  } else {
    console.log('❌ FAIL: Server did not start');
  }
  
  if (output.includes('WAHA setup failed but server continues')) {
    console.log('✅ SUCCESS: WAHA failure was handled gracefully');
  } else {
    console.log('⚠️  WARNING: WAHA setup status unclear');
  }
  
  // Kill the server
  server.kill();
  process.exit(0);
}, 3000);
