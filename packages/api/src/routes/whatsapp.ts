import express, { Router } from 'express';

import { logger } from '../utils/logger.js';

const router: express.Router = Router();

/**
 * @swagger
 * /api/whatsapp/webhook:
 *   post:
 *     summary: WhatsApp webhook endpoint
 *     description: Handles incoming WhatsApp messages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Message processed successfully
 *       400:
 *         description: Invalid request
 */
// Import required types and services
import {
  WhatsAppWebhookEntry,
  WhatsAppIncomingMessage,
} from '@hotel-voice-bot/shared';
import { wahaClient, WAHAMessage } from '../services/whatsapp/wahaClient.js';
// Route for verifying webhook token
router.get('/webhook', (req, res) => {
  const token = req.query['token'] as string;

  if (wahaClient.verifyWebhookToken(token)) {
    return res.status(200).send('Token verified');
  }

  logger.warn('Failed to verify webhook token', { token });
  res.status(403).send('Verification failed');
});

// Route for processing webhook events
router.post('/webhook', async (req, res) => {
  const token = req.query['token'] as string;

  if (!wahaClient.verifyWebhookToken(token)) {
    logger.warn('Invalid WAHA webhook token');
    return res.status(403).send('Invalid token');
  }

  const message: WAHAMessage = req.body;

  await processIncomingMessage(message);

  // Acknowledge receipt
  res.status(200).send('EVENT_RECEIVED');
});

// Function to process incoming messages
async function processIncomingMessage(message: WAHAMessage) {
  logger.info('Processing incoming WAHA message', { message });

  try {
    const from = message.from;
    const text = message.body || 'No text';

    // Send acknowledgment using WAHA
    await wahaClient.sendTextMessage(from, `You said: ${text}`);
  } catch (error) {
    logger.error('Failed to process incoming message', { message, error });
  }
}

export default router;
