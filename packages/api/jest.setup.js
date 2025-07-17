// Global test setup
const { config } = require('dotenv');
const path = require('path');

// Load test environment variables
config({ path: path.join(__dirname, '../../.env.test') });
