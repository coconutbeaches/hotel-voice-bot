/* eslint-env node */
import { createReadStream, statSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';

import cors from 'cors';
import express from 'express';
import FormData from 'form-data';
import helmet from 'helmet';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { WebSocketServer } from 'ws';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store for active audio buffers per connection
const audioBuffers = new Map();

// Create Express app
const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'coconut-voice-socket',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Coconut Beach Resort Voice WebSocket Server',
    status: 'ready',
    endpoints: {
      health: '/health',
      websocket: '/voice',
    },
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/voice',
  perMessageDeflate: false,
});

console.log('🚀 Initializing WebSocket server for voice chat...');

wss.on('connection', (ws, req) => {
  console.log('🟢 New WebSocket connection on /voice');
  console.log('🎤 New voice chat connection established');
  console.log('📍 Client IP:', req.socket.remoteAddress);
  console.log('🌐 User-Agent:', req.headers['user-agent'] || 'Unknown');

  // Initialize audio buffer for this connection
  const connectionId = Date.now() + Math.random();
  audioBuffers.set(connectionId, []);

  // Send connection confirmation
  ws.send(
    JSON.stringify({
      type: 'connected',
      data: 'Voice chat ready! Start speaking...',
    })
  );

  ws.on('message', async data => {
    try {
      // Handle different message types
      if (data instanceof Buffer) {
        // Check if this is actually JSON data disguised as a buffer
        try {
          const potentialJson = data.toString();
          const message = JSON.parse(potentialJson);

          // If we successfully parsed JSON, treat it as a text message
          console.log('[C1-DIAG] 📝 Received JSON message:', message);

          if (message.type === 'stop') {
            // Process accumulated audio
            console.log('[C1-DIAG] 🛑 Stop message received');
            console.log('[C1-DIAG] [Transcription STARTED]', new Date().toISOString());
            // Send debug message to frontend
            ws.send(
              JSON.stringify({
                type: 'debug',
                step: 'Stop message received, starting audio processing...',
              })
            );
            
            try {
              await processAudioBuffer(ws, connectionId);
            } catch (processError) {
              console.error('[C1-DIAG] [Transcription FAILED]', new Date().toISOString(), '- Full stack trace:', processError.stack);
              throw processError;
            }
          }
          return;
        } catch (jsonError) {
          // Not JSON, treat as audio data
          console.log(
            '[C1-DIAG] 📡 Backend: Received audio chunk:',
            data.length,
            'bytes'
          );
          console.log('[C1-DIAG] 🔍 Backend: First few bytes:', data.slice(0, 5));

          // Add to buffer
          const buffer = audioBuffers.get(connectionId) || [];
          buffer.push(data);
          audioBuffers.set(connectionId, buffer);

          // Send acknowledgment
          ws.send(
            JSON.stringify({
              type: 'audio_received',
              data: 'Audio chunk received',
            })
          );
        }
      } else {
        // Text message (JSON)
        const message = JSON.parse(data.toString());
        console.log('[C1-DIAG] 📝 Received text message:', message);

        if (message.type === 'stop') {
          // Process accumulated audio
          console.log('[C1-DIAG] 🛑 Stop message received');
          console.log('[C1-DIAG] [Transcription STARTED]', new Date().toISOString());
          // Send debug message to frontend
          ws.send(
            JSON.stringify({
              type: 'debug',
              step: 'Stop message received, starting audio processing...',
            })
          );
          
          try {
            await processAudioBuffer(ws, connectionId);
          } catch (processError) {
            console.error('[C1-DIAG] [Transcription FAILED]', new Date().toISOString(), '- Full stack trace:', processError.stack);
            throw processError;
          }
        }
      }
    } catch (error) {
      console.error('[C1-DIAG] ❌ Error processing message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Error processing your message: ' + error.message,
        })
      );
    }
  });

  ws.on('close', () => {
    console.log('🔌 Voice chat connection closed');
    // Clean up audio buffer
    audioBuffers.delete(connectionId);
  });

  ws.on('error', error => {
    console.error('❌ WebSocket error:', error);
    audioBuffers.delete(connectionId);
  });
});

async function processAudioBuffer(ws, connectionId) {
  try {
    const buffer = audioBuffers.get(connectionId);
    if (!buffer || buffer.length === 0) {
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'No audio data received',
        })
      );
      return;
    }

    console.log('[C1-DIAG] 🎵 Processing audio buffer with', buffer.length, 'chunks');

    // Combine all audio chunks
    const combinedBuffer = Buffer.concat(buffer);
    console.log('[C1-DIAG] 🟢 Audio buffer assembled');
    console.log('[C1-DIAG] 📦 Combined audio size:', combinedBuffer.length, 'bytes');

    // Clear the buffer
    audioBuffers.set(connectionId, []);

    // Send debug message to frontend
    ws.send(
      JSON.stringify({
        type: 'debug',
        step: 'Audio buffer assembled, starting transcription...',
      })
    );

    // Save to temporary file
    const tempFile = join(tmpdir(), `voice-${connectionId}-${Date.now()}.webm`);
    console.log('[C1-DIAG] 💾 Writing audio to temp file:', tempFile);
    console.log('[C1-DIAG] 💾 Temp file path:', tempFile);
    console.log('[C1-DIAG] 💾 Temp file size:', combinedBuffer.length, 'bytes');
    await writeFile(tempFile, combinedBuffer);
    
    // Get file stats after writing
    const stats = statSync(tempFile);
    console.log('[C1-DIAG] ✅ Audio file written successfully:', {
      path: tempFile,
      size: combinedBuffer.length,
      fileSize: stats.size,
      exists: true,
      firstBytes: combinedBuffer.slice(0, 20).toString('hex'),
      isValidWebM: combinedBuffer.slice(0, 4).toString('hex') === '1f43b675'
    });

    try {
      // Step 1: Transcribe audio using Whisper
      console.log('[C1-DIAG] 🎧 Transcribing audio...');
      console.log('[C1-DIAG] 🔍 Backend: Audio file details:', {
        path: tempFile,
        size: combinedBuffer.length,
        firstBytes: combinedBuffer.slice(0, 10),
        mimeType: 'audio/webm', // We know it's webm from frontend
      });

      ws.send(
        JSON.stringify({
          type: 'status',
          data: 'Transcribing your message...',
        })
      );

      let userMessage = '';

      try {
        // Create multipart/form-data for the OpenAI API
        console.log('[C1-DIAG] 📤 Preparing multipart/form-data for OpenAI API upload');
        const form = new FormData();

        // Required fields
        console.log('[C1-DIAG] 📁 Adding file stream to form data:', tempFile);
        form.append('file', createReadStream(tempFile), {
          filename: 'audio.webm',
          contentType: 'audio/webm',
        });
        form.append('model', process.env.WHISPER_MODEL || 'whisper-1');
        form.append(
          'response_format',
          process.env.WHISPER_RESPONSE_FORMAT || 'json'
        );

        // Log all Whisper API request metadata
        const whisperMetadata = {
          model: process.env.WHISPER_MODEL || 'whisper-1',
          response_format: process.env.WHISPER_RESPONSE_FORMAT || 'json',
          filename: 'audio.webm',
          mimeType: 'audio/webm',
          filePath: tempFile,
          language: process.env.WHISPER_LANGUAGE || 'auto-detect',
          temperature: process.env.WHISPER_TEMPERATURE || 'default',
          prompt: process.env.WHISPER_PROMPT || 'none'
        };
        console.log('[C1-DIAG] 🔧 Form data prepared with metadata:', whisperMetadata);

        // Optional parameters (add if specified in environment)
        if (process.env.WHISPER_TEMPERATURE) {
          form.append('temperature', process.env.WHISPER_TEMPERATURE);
        }
        if (process.env.WHISPER_LANGUAGE) {
          form.append('language', process.env.WHISPER_LANGUAGE);
        }
        if (process.env.WHISPER_PROMPT) {
          form.append('prompt', process.env.WHISPER_PROMPT);
        }

        console.log('[C1-DIAG] 📋 Form headers:', form.getHeaders());

        const response = await fetch(
          'https://api.openai.com/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: form,
          }
        );

        if (!response.ok) {
          // Log detailed response info for non-2xx responses
          const errorText = await response.text();
          console.error('[C1-DIAG] ❌ OpenAI API Error - Full status code:', response.status);
          console.error('[C1-DIAG] ❌ OpenAI API Error - Full response body:', errorText);
          console.error('[C1-DIAG] ❌ OpenAI API Error - Full headers:', Object.fromEntries(response.headers.entries()));
          console.error('[C1-DIAG] ❌ OpenAI API Error - Complete details:', {
            status: response.status,
            statusText: response.statusText,
            responseBody: errorText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries()),
          });
          throw new Error(
            `HTTP error! status: ${response.status}, response: ${errorText}`
          );
        }

        const transcription = await response.json();

        userMessage = transcription.text;
        console.log('[C1-DIAG] 📝 Whisper transcription done:', userMessage);

        if (!userMessage || userMessage.trim() === '') {
          console.warn('[C1-DIAG] ⚠️ Backend: Empty transcription result');
        }
      } catch (transcriptionError) {
        console.error('[C1-DIAG] ❌ Backend: Transcription API error - Full stack trace:', transcriptionError.stack);
        console.error('[C1-DIAG] ❌ Backend: Transcription API error - Details:', {
          message: transcriptionError.message,
          code: transcriptionError.code,
          type: transcriptionError.type,
          stack: transcriptionError.stack,
        });

        // Try to provide more specific error info
        if (transcriptionError.message.includes('format')) {
          console.error(
            '[C1-DIAG] 🚨 Backend: Audio format issue detected. WebM may not be supported.'
          );
        }

        throw transcriptionError;
      }
      console.log(
        '[C1-DIAG] 📤 Backend: Sending transcription to frontend:',
        userMessage
      );
      ws.send(
        JSON.stringify({
          type: 'transcription',
          text: userMessage,
        })
      );

      // Send debug message
      ws.send(
        JSON.stringify({
          type: 'debug',
          step: 'Transcription completed and sent',
        })
      );

      if (!userMessage.trim()) {
        ws.send(
          JSON.stringify({
            type: 'error',
            data: 'No speech detected. Please try again.',
          })
        );
        return;
      }

      // Step 2: Generate AI response using GPT-4o
      console.log('[C1-DIAG] 🤖 Generating AI response...');
      ws.send(
        JSON.stringify({
          type: 'status',
          data: 'Generating response...',
        })
      );

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are the friendly AI assistant for Coconut Beach Resort & Spa. You help guests with:
            - Room service and dining reservations
            - Spa appointments and wellness activities  
            - Local attractions and beach activities
            - Resort amenities and services
            - Check-in/check-out assistance
            
            Keep responses conversational, warm, and helpful. Use a friendly, welcoming tone that matches the tropical resort atmosphere. If you don't know something specific about the resort, offer to connect them with the front desk.`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;
      console.log('[C1-DIAG] 🤖 GPT-4o reply:', aiResponse);

      // Send AI response to client
      console.log('[C1-DIAG] 📤 Backend: Sending AI response to frontend:', aiResponse);
      ws.send(
        JSON.stringify({
          type: 'ai_response',
          text: aiResponse,
        })
      );

      // Send debug message
      ws.send(
        JSON.stringify({
          type: 'debug',
          step: 'AI response completed and sent',
        })
      );

      // Step 3: Convert AI response to speech using TTS
      console.log('[C1-DIAG] 🔊 Converting to speech...');
      ws.send(
        JSON.stringify({
          type: 'status',
          data: 'Converting to speech...',
        })
      );

      const speech = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'nova', // Warm, friendly voice
        input: aiResponse,
        response_format: 'mp3',
        speed: 1.0,
      });

      // Convert response to buffer
      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      console.log('[C1-DIAG] 🔊 TTS synthesis complete');
      console.log('[C1-DIAG] 🎵 Generated audio size:', audioBuffer.length, 'bytes');

      // Send audio as base64 to client
      const audioBase64 = audioBuffer.toString('base64');
      console.log(
        '[C1-DIAG] 📤 Backend: Sending TTS audio to frontend, size:',
        audioBase64.length,
        'chars'
      );
      ws.send(
        JSON.stringify({
          type: 'tts_audio',
          audio: audioBase64,
        })
      );

      // Send debug message
      ws.send(
        JSON.stringify({
          type: 'debug',
          step: 'TTS audio completed and sent',
        })
      );

      console.log('[C1-DIAG] ✅ Voice conversation completed successfully');
    } catch (error) {
      console.error('[C1-DIAG] ❌ Error in voice processing pipeline - Full stack trace:', error.stack);
      console.error('[C1-DIAG] ❌ Error in voice processing pipeline:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Sorry, I encountered an error processing your request. Please try again.',
        })
      );
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (cleanupError) {
        console.error('⚠️ Error cleaning up temp file:', cleanupError);
      }
    }
  } catch (error) {
    console.error('[C1-DIAG] ❌ Error in processAudioBuffer - Full stack trace:', error.stack);
    console.error('[C1-DIAG] ❌ Error in processAudioBuffer:', error);
    ws.send(
      JSON.stringify({
        type: 'error',
        data: 'Failed to process audio: ' + error.message,
      })
    );
  }
}

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎤 WebSocket endpoint: wss://localhost:${PORT}/voice`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Home: http://localhost:${PORT}/`);
});
