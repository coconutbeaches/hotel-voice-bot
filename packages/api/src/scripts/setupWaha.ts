import { wahaClient } from '../services/whatsapp/wahaClient.js';
import { logger } from '../utils/logger.js';
import { WAHAClientStub } from '../services/whatsapp/wahaClientStub.js';

async function setupWaha() {
  // Check if WAHA client is available (not a stub)
  if (!wahaClient || wahaClient instanceof WAHAClientStub) {
    logger.warn('[WAHA] Skipping WAHA setup: WAHA client not available or using stub');
    return;
  }

  try {
    logger.info('Setting up WAHA session...');

    // Check if session already exists and is working
    const sessionStatus = await wahaClient.getSessionStatus();
    
    if (sessionStatus.status === 'WORKING') {
      logger.info('WAHA session is already working');
      return;
    }

    // Start a new session
    logger.info('Starting new WAHA session...');
    const session = await wahaClient.startSession();
    
    if (session.status === 'SCAN_QR_CODE') {
      logger.info('Session requires QR code scanning');
      const qrCode = await wahaClient.getQRCode();
      if (qrCode) {
        logger.info('QR Code:', qrCode);
      }
    } else if (session.status === 'WORKING') {
      logger.info('Session is working!');
    } else {
      logger.warn('Session status:', session.status);
    }

    // Wait for session to be ready
    let retries = 0;
    const maxRetries = 30; // 30 seconds timeout
    
    while (retries < maxRetries) {
      const isReady = await wahaClient.isSessionReady();
      if (isReady) {
        logger.info('WAHA session is ready!');
        break;
      }
      
      logger.info('Waiting for session to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (retries >= maxRetries) {
      logger.error('Timeout waiting for WAHA session to be ready');
      // Don't exit, just log the error
    }

  } catch (error) {
    logger.error('Failed to setup WAHA session:', error);
    // Don't exit, allow the app to continue without WAHA
    logger.warn('[WAHA] Continuing without WAHA integration');
  }
}

// Run setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupWaha();
}

export { setupWaha };
