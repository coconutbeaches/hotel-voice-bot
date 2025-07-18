import { writeFileSync, existsSync } from 'fs';
import { Server as HTTPServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';

import { Server } from 'socket.io';

import { openaiClient } from '../services/openaiClient.js';
import { logger } from '../utils/logger.js';

interface SessionData {
  id: string;
  language: string;
  context: string[];
  lastActivity: number;
  audioChunks: Buffer[];
  totalAudioSize: number;
  audioMimeType: string;
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
      audioChunks: [],
      totalAudioSize: 0,
      audioMimeType: 'audio/mp4', // Default to MP4
    };
    sessions.set(socket.id, session);

    // Handle voice data (complete audio buffer)
    socket.on('voice-data', async (audioData: ArrayBuffer) => {
      try {
        session.lastActivity = Date.now();

        const audioBuffer = Buffer.from(audioData);
        logger.info('[voice-data] Received complete audio buffer', {
          sessionId: socket.id,
          size: audioBuffer.length,
          mimeType: session.audioMimeType,
        });

        // 🧪 Debug: Log first 100 bytes as base64
        const debugBytes = audioBuffer.slice(0, 100).toString('base64');
        logger.debug('[voice-data] First 100 bytes (base64):', debugBytes);

        // 🛡️ Optional: Save debug copy to disk
        if (process.env.NODE_ENV === 'development') {
          const debugPath = join(tmpdir(), `speech-debug-${Date.now()}.mp4`);
          writeFileSync(debugPath, audioBuffer);
          logger.debug('[voice-data] Debug file saved:', debugPath);
        }

        // Process audio with Whisper
        const transcript = await openaiClient.transcribeAudio(audioBuffer);
        if (!transcript) {
          throw new Error('Failed to transcribe audio');
        }

        // Emit transcription result
        socket.emit('transcription', { text: transcript });

        // Generate AI response
        const prompt = `You are Coconut, a friendly AI assistant for Coconut Beach Hotel. 
Keep responses concise for voice. User said: "${transcript}"`;

        const responseText = await openaiClient.generateResponse(prompt);
        if (responseText) {
          socket.emit('voice-response', { text: responseText });
        }
      } catch (error) {
        logger.error('[voice-data] Error processing audio:', error);
        socket.emit('error', {
          message: 'Failed to process audio',
          details: (error as Error).message,
        });
      }
    });

    // Handle audio chunks for streaming assembly
    socket.on(
      'audio-chunk',
      async (data: {
        chunk?: ArrayBuffer;
        audio?: ArrayBuffer | string;
        mimeType?: string;
        isLast?: boolean;
      }) => {
        try {
          // Enhanced debug logs at the very start
          console.log('[C1-DEBUG] Received audio-chunk');
          console.log('[C1-DEBUG] typeof data.audio:', typeof data.audio);
          console.log('[C1-DEBUG] is Buffer:', Buffer.isBuffer(data.audio));
          console.log(
            '[C1-DEBUG] audio instanceof Uint8Array:',
            data.audio instanceof Uint8Array
          );
          console.log('[C1-DEBUG] audio length:', data.audio?.length);
          console.log(
            '[C1-DEBUG] audio (hex preview):',
            typeof data.audio === 'string'
              ? data.audio.slice(0, 16)
              : Buffer.from(data.audio).toString('hex').slice(0, 16)
          );

          try {
            const buffer = Buffer.from(data.audio);
            console.log(
              '[C1-DEBUG] ✅ Buffer.from() succeeded:',
              buffer.length,
              'bytes'
            );
          } catch (e) {
            console.error('[C1-DEBUG] ❌ Buffer.from() failed:', e.message);
          }

          // C1 Robust chunk handler validation
          if (!data || (!data.audio && !data.chunk)) {
            console.warn(
              '[C1-DEBUG] Skipping invalid chunk (missing audio):',
              data
            );
            return;
          }

          let audioBuffer;
          try {
            // Test Buffer.from before actual use
            try {
              const buffer = Buffer.from(data.audio);
              console.log('[C1-DEBUG] Buffer created:', buffer.length, 'bytes');
            } catch (e) {
              console.error('[C1-DEBUG] Buffer.from failed:', e.message);
            }

            // Detect if base64
            const isBase64 =
              typeof data.audio === 'string' &&
              /^[A-Za-z0-9+/=]+$/.test(data.audio.slice(0, 24));
            audioBuffer = Buffer.from(
              data.audio,
              isBase64 ? 'base64' : undefined
            );
            console.log(
              `[C1-DEBUG] Parsed audio buffer: ${audioBuffer.length} bytes`
            );
          } catch (err) {
            console.error('[C1-DEBUG] Failed to convert chunk to Buffer:', err);
            return;
          }

          // Optional: Log chunk info
          console.log(
            `[C1-DEBUG] Received audio chunk (${audioBuffer.length} bytes)`
          );

          session.lastActivity = Date.now();

          session.audioChunks.push(audioBuffer);
          session.totalAudioSize += audioBuffer.length;

          // Update MIME type if provided
          if (data.mimeType) {
            session.audioMimeType = data.mimeType;
          }

          logger.info('[audio-chunk] Received chunk', {
            sessionId: socket.id,
            chunkSize: audioBuffer.length,
            totalChunks: session.audioChunks.length,
            totalSize: session.totalAudioSize,
            mimeType: session.audioMimeType,
            isLast: data.isLast,
          });

          // 🧱 If this is the last chunk, assemble and process
          if (data.isLast) {
            logger.info('[audio-chunk] Assembling final audio buffer', {
              totalChunks: session.audioChunks.length,
              totalSize: session.totalAudioSize,
              mimeType: session.audioMimeType,
            });

            // C1-DEBUG: Log chunk assembly details
            console.log('[C1-DEBUG] Audio chunk assembly:', {
              chunksReceived: session.audioChunks.length,
              totalBufferSize: session.totalAudioSize,
              mimeType: session.audioMimeType,
              chunkSizes: session.audioChunks.map(chunk => chunk.length),
            });

            // Combine all chunks into final buffer
            const finalBuffer = Buffer.concat(session.audioChunks);

            // C1-DEBUG: Log final buffer details
            console.log('[C1-DEBUG] Final buffer assembled:', {
              finalBufferSize: finalBuffer.length,
              expectedSize: session.totalAudioSize,
              first16BytesHex: finalBuffer.slice(0, 16).toString('hex'),
              detectedMimeType: session.audioMimeType,
            });

            // C1-DEBUG: Save assembled buffer to disk for validation
            try {
              const debugPath = join(tmpdir(), `output-${Date.now()}.webm`);
              writeFileSync(debugPath, finalBuffer);
              console.log('[C1-DEBUG] Assembled audio saved to:', debugPath);
              console.log('[C1-DEBUG] Test playback with: ffplay', debugPath);
            } catch (saveError) {
              console.error('[C1-DEBUG] Failed to save debug file:', saveError);
            }

            // Verify buffer integrity
            if (finalBuffer.length !== session.totalAudioSize) {
              throw new Error(
                `Buffer size mismatch: expected ${session.totalAudioSize}, got ${finalBuffer.length}`
              );
            }

            // 🧪 Debug: Log assembly details
            const debugBytes = finalBuffer.slice(0, 100).toString('base64');
            logger.debug(
              '[audio-chunk] Final buffer first 100 bytes (base64):',
              debugBytes
            );

            // 🛡️ Optional: Save debug copy to disk
            if (process.env.NODE_ENV === 'development') {
              const debugPath = join(
                tmpdir(),
                `speech-assembled-${Date.now()}.mp4`
              );
              writeFileSync(debugPath, finalBuffer);
              logger.debug(
                '[audio-chunk] Debug assembled file saved:',
                debugPath
              );
            }

            // Process with Whisper
            const transcript = await openaiClient.transcribeAudio(finalBuffer);
            if (!transcript) {
              throw new Error('Failed to transcribe assembled audio');
            }

            // Emit transcription result
            socket.emit('transcription', { text: transcript });

            // Generate AI response
            const prompt = `You are Coconut, a friendly AI assistant for Coconut Beach Hotel. 
Keep responses concise for voice. User said: "${transcript}"`;

            const responseText = await openaiClient.generateResponse(prompt);
            if (responseText) {
              socket.emit('voice-response', { text: responseText });
            }

            // Clear chunks for next recording
            session.audioChunks = [];
            session.totalAudioSize = 0;
          }
        } catch (error) {
          logger.error('[audio-chunk] Error processing chunk:', error);
          socket.emit('error', {
            message: 'Failed to process audio chunk',
            details: (error as Error).message,
          });

          // Reset chunks on error
          session.audioChunks = [];
          session.totalAudioSize = 0;
        }
      }
    );

    // Handle legacy audio processing (for backward compatibility)
    socket.on(
      'process-audio',
      async (data: { audio: string; sessionId: string; language: string }) => {
        try {
          // C1 Robust validation for process-audio
          if (!data || !data.audio) {
            console.warn(
              '[C1-DEBUG] Skipping invalid process-audio (missing audio):',
              data
            );
            return;
          }

          session.lastActivity = Date.now();

          let audioBuffer: Buffer;
          try {
            // Convert base64 to buffer
            audioBuffer = Buffer.from(data.audio, 'base64');
          } catch (err) {
            console.error(
              '[C1-DEBUG] Failed to convert process-audio to Buffer:',
              err
            );
            return;
          }

          // Optional: Log audio info
          console.log(
            `[C1-DEBUG] Processing audio (${audioBuffer.length} bytes)`
          );

          logger.info('[process-audio] Processing base64 audio', {
            sessionId: data.sessionId,
            size: audioBuffer.length,
          });

          // Process with updated transcription
          const transcript = await openaiClient.transcribeAudio(audioBuffer);
          if (!transcript) {
            throw new Error('Failed to transcribe audio');
          }

          // Emit transcription
          socket.emit('transcription', { text: transcript, isFinal: true });

          // Generate response
          const prompt = `You are Coconut, a friendly AI assistant for Coconut Beach Hotel. 
Keep responses concise for voice. User said: "${transcript}"`;

          const responseText = await openaiClient.generateResponse(prompt);
          if (responseText) {
            socket.emit('response', { text: responseText });
          }
        } catch (error) {
          logger.error('[process-audio] Error processing audio:', error);
          socket.emit('error', {
            message: 'Failed to process audio',
            details: (error as Error).message,
          });
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
