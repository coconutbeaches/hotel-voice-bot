import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env') });

// Start the server
import('./index.js').then(() => {
  console.log('🚀 Hotel Voice Bot API server started successfully!');
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
