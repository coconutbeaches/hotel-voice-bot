import { Server as HTTPServer } from 'http';

import { Server } from 'socket.io';

import { openaiClient } from '../services/openaiClient.js';
import { logger } from '../utils/logger.js';

interface SessionData {
  id: string;
  language: string;
  context: string[];
  lastActivity: number;
}

const sessions = new Map<string, SessionData>();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Cleanup inactive sessions
setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        sessions.delete(id);
        logger.info('Cleaned up inactive session', { sessionId: id });
      }
    }
  },
  5 * 60 * 1000
); // Check every 5 minutes

export function setupVoiceSocket(server: HTTPServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', socket => {
    logger.info('Voice socket connected', { socketId: socket.id });

    // Initialize session
    const session: SessionData = {
      id: socket.id,
      language: 'en',
      context: [],
      lastActivity: Date.now(),
    };
    sessions.set(socket.id, session);

    // Handle audio chunks for streaming transcription
    socket.on(
      'audio-chunk',
      async (data: { audio: string; sessionId: string; language: string }) => {
        try {
          session.lastActivity = Date.now();

          // Convert base64 to buffer
          const audioBuffer = Buffer.from(data.audio, 'base64');

          // For real streaming, we'd accumulate chunks and process them
          // For now, we'll process complete audio in 'process-audio' event
          logger.debug('Received audio chunk', {
            sessionId: data.sessionId,
            size: audioBuffer.length,
          });

          // Monitor connection quality based on chunk delivery
          const latency = Date.now() - session.lastActivity;
          let quality: 'good' | 'poor' | 'bad' = 'good';

          if (latency > 2000) quality = 'bad';
          else if (latency > 500) quality = 'poor';

          socket.emit('connection-quality', { level: quality });
        } catch (error) {
          logger.error('Error processing audio chunk', error);
          socket.emit('error', { message: 'Failed to process audio chunk' });
        }
      }
    );

    // Process complete audio
    socket.on(
      'process-audio',
      async (data: { audio: string; sessionId: string; language: string }) => {
        try {
          session.lastActivity = Date.now();

          // Convert base64 to buffer
          const audioBuffer = Buffer.from(data.audio, 'base64');

          // Transcribe audio
          const transcript = await openaiClient.transcribeAudio(audioBuffer);
          if (!transcript) {
            throw new Error('Failed to transcribe audio');
          }

          // Emit final transcription
          socket.emit('transcription', { text: transcript, isFinal: true });

          // Update session context
          session.context.push(`User: ${transcript}`);
          if (session.context.length > 10) {
            session.context = session.context.slice(-10); // Keep last 10 messages
          }

          // Generate response with context
          const prompt = `You are Coconut, a friendly and helpful AI assistant for Coconut Beach Hotel. 
You help guests with questions about the hotel, amenities, bookings, and local information.
Be conversational, warm, and natural in your responses. Keep responses concise for voice.

Context:
${session.context.join('\n')}

Current user message: ${transcript}

Provide a helpful response:`;

          const responseText = await openaiClient.generateResponse(prompt);
          if (!responseText) {
            throw new Error('Failed to generate response');
          }

          // Update context with response
          session.context.push(`Assistant: ${responseText}`);

          // Generate audio response
          const audioResponse = await openaiClient.textToSpeech(
            responseText,
            'nova'
          ); // Using nova as close to "cove"

          if (audioResponse) {
            // Convert to base64 for transmission
            const audioBase64 = audioResponse.toString('base64');
            const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

            socket.emit('response', {
              text: responseText,
              audioUrl,
            });
          } else {
            // Fallback to text only
            socket.emit('response', { text: responseText });
          }
        } catch (error) {
          logger.error('Error processing audio', error);
          socket.emit('error', { message: 'Failed to process your request' });
        }
      }
    );

    // Handle text messages (fallback mode)
    socket.on(
      'text-message',
      async (data: { text: string; sessionId: string; language: string }) => {
        try {
          session.lastActivity = Date.now();
          const userText = data.text;

          // Update session context
          session.context.push(`User: ${userText}`);
          if (session.context.length > 10) {
            session.context = session.context.slice(-10);
          }

          // Generate response
          const prompt = `You are Coconut, a friendly and helpful AI assistant for Coconut Beach Hotel. 
You help guests with questions about the hotel, amenities, bookings, and local information.
Be conversational, warm, and natural in your responses.

Context:
${session.context.join('\n')}

Current user message: ${userText}

Provide a helpful response:`;

          const responseText = await openaiClient.generateResponse(prompt);
          if (!responseText) {
            throw new Error('Failed to generate response');
          }

          // Update context
          session.context.push(`Assistant: ${responseText}`);

          // Send text response
          socket.emit('response', { text: responseText });
        } catch (error) {
          logger.error('Error processing text message', error);
          socket.emit('error', { message: 'Failed to process your message' });
        }
      }
    );

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('Voice socket disconnected', { socketId: socket.id });
      sessions.delete(socket.id);
    });
  });

  return io;
}
