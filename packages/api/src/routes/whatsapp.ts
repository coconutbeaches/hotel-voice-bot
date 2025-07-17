import express, { Router } from 'express';

import axios from 'axios';
// TODO: Re-enable OpenAI integration
// import { OpenAIClient } from '@hotel-voice-bot/integrations';

import { logger } from '../utils/logger.js';
import { wahaClient, WAHAMessage } from '../services/whatsapp/wahaClient.js';
import { FAQService } from '../services/faq/faqService.js';
import { MessageLogger } from '../services/messaging/messageLogger.js';

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

// Initialize services
const faqService = new FAQService();
const messageLogger = new MessageLogger();
// Import OpenAI client
import { openaiClient } from '../services/openaiClient.js';

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

// Function to process incoming messages with voice-to-voice FAQ flow
async function processIncomingMessage(message: WAHAMessage) {
  logger.info('Processing incoming WAHA message', { 
    messageId: message.id,
    from: message.from,
    type: message.type 
  });

  try {
    const whatsappNumber = message.from;
    let userText = '';
    let messageType: 'guest_text' | 'guest_audio' = 'guest_text';

    // Get or create conversation session
    const sessionId = await messageLogger.getOrCreateSession(whatsappNumber);
    if (!sessionId) {
      logger.error('Failed to create/get session for message processing');
      await wahaClient.sendTextMessage(whatsappNumber, 'Sorry, I\'m having trouble right now. Please try again in a moment.');
      return;
    }

    // Process message based on type
    if (message.type === 'voice' && message.voice) {
      messageType = 'guest_audio';
      
      // Download audio file from WAHA
      const audioBuffer = await downloadAudioFromWAHA(message.voice.id);
      if (!audioBuffer) {
        logger.error('Failed to download audio file', { messageId: message.id });
        await wahaClient.sendTextMessage(whatsappNumber, 'Sorry, I couldn\'t process your voice message. Please try again.');
        return;
      }

      // TODO: Re-enable OpenAI transcription
      if (!openaiClient) {
        logger.warn('OpenAI client not available, cannot transcribe audio');
        await wahaClient.sendTextMessage(whatsappNumber, 'Voice messages are temporarily unavailable. Please send a text message instead.');
        return;
      }
      
      // Transcribe audio using Whisper
      userText = await openaiClient.transcribeAudio(audioBuffer);
      if (!userText || userText.includes('Sorry, I could not transcribe')) {
        logger.error('Failed to transcribe audio', { messageId: message.id });
        await wahaClient.sendTextMessage(whatsappNumber, 'Sorry, I couldn\'t understand your voice message. Please try again or send a text message.');
        return;
      }

      logger.info('Audio transcribed successfully', { messageId: message.id, transcription: userText });
    } else if (message.type === 'text' && message.body) {
      messageType = 'guest_text';
      userText = message.body;
    } else {
      logger.warn('Unsupported message type', { messageId: message.id, type: message.type });
      await wahaClient.sendTextMessage(whatsappNumber, 'Sorry, I can only process text and voice messages at the moment.');
      return;
    }

    // Log the incoming message
    const messageLogId = await messageLogger.logMessage({
      whatsapp_number: whatsappNumber,
      message_type: messageType,
      content: userText,
      conversation_session_id: sessionId,
      metadata: {
        original_message_id: message.id,
        message_timestamp: message.timestamp
      }
    });

    // Find FAQ match
    const faqMatch = await faqService.findBestMatch(userText);
    let responseText = '';
    let shouldEscalate = false;

    if (faqMatch && faqMatch.confidence > 0.5) {
      responseText = faqMatch.faq.answer;
      logger.info('FAQ match found', { 
        messageId: message.id,
        faqId: faqMatch.faq.id,
        confidence: faqMatch.confidence,
        matchType: faqMatch.matchType 
      });
    } else {
      // No good FAQ match - escalate or provide fallback
      shouldEscalate = true;
      responseText = 'I\'m sorry, I don\'t have a specific answer for that question. Let me connect you with our staff who can help you better.';
      logger.info('No FAQ match found, escalating', { messageId: message.id, userQuery: userText });
    }

    // Send response based on original message type
    if (messageType === 'guest_audio') {
      // TODO: Re-enable OpenAI text-to-speech
      let audioBuffer: Buffer | null = null;
      if (openaiClient) {
        audioBuffer = await openaiClient.textToSpeech(responseText);
      }
      if (audioBuffer) {
        await wahaClient.sendVoiceMessage(whatsappNumber, audioBuffer);
        
        // Log bot audio response
        await messageLogger.logMessage({
          whatsapp_number: whatsappNumber,
          message_type: 'bot_audio',
          content: responseText,
          conversation_session_id: sessionId,
          escalated_to_human: shouldEscalate,
          metadata: {
            response_to_message_id: messageLogId,
            faq_match: faqMatch ? {
              faq_id: faqMatch.faq.id,
              confidence: faqMatch.confidence,
              match_type: faqMatch.matchType
            } : null
          }
        });
      } else {
        // Fallback to text if TTS fails
        await wahaClient.sendTextMessage(whatsappNumber, responseText);
        
        // Log bot text response
        await messageLogger.logMessage({
          whatsapp_number: whatsappNumber,
          message_type: 'bot_text',
          content: responseText,
          conversation_session_id: sessionId,
          escalated_to_human: shouldEscalate,
          metadata: {
            response_to_message_id: messageLogId,
            tts_failed: true,
            faq_match: faqMatch ? {
              faq_id: faqMatch.faq.id,
              confidence: faqMatch.confidence,
              match_type: faqMatch.matchType
            } : null
          }
        });
      }
    } else {
      // Send text response
      await wahaClient.sendTextMessage(whatsappNumber, responseText);
      
      // Log bot text response
      await messageLogger.logMessage({
        whatsapp_number: whatsappNumber,
        message_type: 'bot_text',
        content: responseText,
        conversation_session_id: sessionId,
        escalated_to_human: shouldEscalate,
        metadata: {
          response_to_message_id: messageLogId,
          faq_match: faqMatch ? {
            faq_id: faqMatch.faq.id,
            confidence: faqMatch.confidence,
            match_type: faqMatch.matchType
          } : null
        }
      });
    }

    // Update session message count
    await messageLogger.updateSessionMessageCount(sessionId);

    // Handle escalation if needed
    if (shouldEscalate) {
      await messageLogger.escalateSession(sessionId, 'no_faq_match');
    }

    logger.info('Message processed successfully', { 
      messageId: message.id,
      sessionId,
      escalated: shouldEscalate 
    });

  } catch (error) {
    logger.error('Failed to process incoming message', { 
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Send error message to user
    try {
      await wahaClient.sendTextMessage(message.from, 'Sorry, I encountered an error processing your message. Please try again.');
    } catch (sendError) {
      logger.error('Failed to send error message', { sendError });
    }
  }
}

// Helper function to download audio from WAHA
async function downloadAudioFromWAHA(mediaId: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(`${process.env.WAHA_URL}/api/files/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WAHA_TOKEN}`
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  } catch (error) {
    logger.error('Error downloading audio from WAHA', { mediaId, error });
    return null;
  }
}

export default router;
