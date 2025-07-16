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
router.post('/webhook', (req, res) => {
  logger.info('WhatsApp webhook received', req.body);

  res.json({
    success: true,
    message: 'Webhook received',
  });
});

export default router;
