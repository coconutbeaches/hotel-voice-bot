import { writeFile, unlink } from 'fs/promises';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';

import OpenAI from 'openai';
import { WebSocketServer } from 'ws';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store for active audio buffers per connection
const audioBuffers = new Map();

// Create HTTP server
const server = createServer((req, res) => {
  // Handle CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'voice-websocket-server',
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hotel Voice Bot WebSocket Server - Ready for connections');
});

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/api/voice-socket',
  perMessageDeflate: false,
});

console.log('🚀 Initializing WebSocket server for voice chat...');

wss.on('connection', (ws, _req) => {
  console.log('🎤 New voice chat connection established');

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
        // Audio data received
        console.log('🎤 [CANARY] Audio chunk received:', {
          connectionId,
          chunkSize: data.length,
          timestamp: new Date().toISOString(),
          totalChunks: (audioBuffers.get(connectionId) || []).length + 1,
        });

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
      } else {
        // Text message (JSON)
        const message = JSON.parse(data.toString());
        console.log('📝 Received message:', message);

        if (message.type === 'stop') {
          console.log('🛑 [CANARY] Stop message received:', {
            connectionId,
            timestamp: new Date().toISOString(),
            message,
          });
          // Process accumulated audio
          await processAudioBuffer(ws, connectionId);
        }
      }
    } catch (error) {
      console.error('❌ Error processing message with full details:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Error processing your message: ' + error.message,
          stack: error.stack,
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

    console.log('🎵 [CANARY] Processing audio buffer:', {
      connectionId,
      chunkCount: buffer.length,
      timestamp: new Date().toISOString(),
    });

    // Combine all audio chunks
    const combinedBuffer = Buffer.concat(buffer);
    console.log('📦 [CANARY] Combined audio buffer:', {
      connectionId,
      totalSize: combinedBuffer.length,
      timestamp: new Date().toISOString(),
    });

    // Clear the buffer
    audioBuffers.set(connectionId, []);

    // Detect MIME type from the first few bytes to determine file extension
    let mimeType = 'audio/webm';
    let fileExtension = 'webm';
    let filename = 'speech.webm';

    // Check for MP4 signature (Safari)
    if (combinedBuffer.length >= 8) {
      const header = combinedBuffer.subarray(0, 8);

      // MP4 files typically start with 'ftyp' at offset 4
      if (header.subarray(4, 8).toString('ascii') === 'ftyp') {
        mimeType = 'audio/mp4';
        fileExtension = 'mp4';
        filename = 'speech.mp4';
      }
    }

    console.log('🎯 [CANARY] Audio format detection:', {
      connectionId,
      detectedMimeType: mimeType,
      fileExtension,
      filename,
      bufferHeader: combinedBuffer.subarray(0, 16).toString('hex'),
      timestamp: new Date().toISOString(),
    });

    // Save to temporary file with correct extension
    const tempFile = join(
      tmpdir(),
      `voice-${connectionId}-${Date.now()}.${fileExtension}`
    );
    console.log('💾 [CANARY] Writing temp file:', {
      connectionId,
      tempFile,
      bufferSize: combinedBuffer.length,
      mimeType,
      timestamp: new Date().toISOString(),
    });
    await writeFile(tempFile, combinedBuffer);
    console.log('✅ [CANARY] Temp file written successfully:', tempFile);

    try {
      // Step 1: Transcribe audio using Whisper with proper FormData
      console.log('🎧 [CANARY] Starting Whisper transcription:', {
        connectionId,
        tempFile,
        bufferSize: combinedBuffer.length,
        mimeType,
        filename,
        model: 'whisper-1',
        timestamp: new Date().toISOString(),
      });
      ws.send(
        JSON.stringify({
          type: 'status',
          data: 'Transcribing your message...',
        })
      );

      // Create FormData with proper file metadata
      const formData = new FormData();
      const audioBlob = new Blob([combinedBuffer], { type: mimeType });
      formData.append('file', audioBlob, filename);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');

      // Debug logging for FormData contents
      console.log('📋 [CANARY] FormData details:', {
        connectionId,
        fileType: audioBlob.type,
        fileName: filename,
        fileSize: audioBlob.size,
        mimeType: mimeType,
        timestamp: new Date().toISOString(),
      });

      // Enhanced debug logs as requested
      console.log('🔍 [C1-DEBUG] Full filename + file size:', {
        connectionId,
        filename: filename,
        fileSize: audioBlob.size,
        timestamp: new Date().toISOString(),
      });

      console.log('🔍 [C1-DEBUG] Full Content-Type of FormData:', {
        connectionId,
        audioBlob_type: audioBlob.type,
        detected_mimeType: mimeType,
        timestamp: new Date().toISOString(),
      });

      console.log(
        '🔍 [C1-DEBUG] First 12 bytes of assembled buffer (base64):',
        {
          connectionId,
          first12Bytes: combinedBuffer.subarray(0, 12).toString('base64'),
          bufferTotalSize: combinedBuffer.length,
          timestamp: new Date().toISOString(),
        }
      );

      // Make direct fetch call to Whisper API with proper headers
      const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      console.log('🌐 [CANARY] Whisper API response headers:', {
        connectionId,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ [CANARY] Whisper API error response:', {
          connectionId,
          status: response.status,
          statusText: response.statusText,
          errorBody,
          timestamp: new Date().toISOString(),
        });

        // Enhanced error logging as requested
        console.error(
          '🔍 [C1-DEBUG] Full Whisper API response body (on error):',
          {
            connectionId,
            fullErrorBody: errorBody,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            timestamp: new Date().toISOString(),
          }
        );

        throw new Error(
          `Whisper API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const transcription = await response.json();

      console.log('📝 [CANARY] Whisper API response:', {
        connectionId,
        transcription: transcription,
        timestamp: new Date().toISOString(),
      });

      const userMessage = transcription.text;
      console.log('📝 [CANARY] Transcription extracted:', {
        connectionId,
        userMessage,
        messageLength: userMessage?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Send transcription to client
      const transcriptMessage = {
        type: 'transcript',
        data: userMessage,
      };
      console.log('📤 [CANARY] Sending transcript to client:', {
        connectionId,
        message: transcriptMessage,
        timestamp: new Date().toISOString(),
      });
      ws.send(JSON.stringify(transcriptMessage));

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
      console.log('🤖 Generating AI response...');
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
      console.log('🤖 AI Response:', aiResponse);

      // Send AI response to client
      ws.send(
        JSON.stringify({
          type: 'ai_response',
          data: aiResponse,
        })
      );

      // Step 3: Convert AI response to speech using TTS
      console.log('🔊 Converting to speech...');
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
      console.log('🎵 Generated audio size:', audioBuffer.length, 'bytes');

      // Send audio as base64 to client
      const audioBase64 = audioBuffer.toString('base64');
      ws.send(
        JSON.stringify({
          type: 'audio',
          data: audioBase64,
        })
      );

      console.log('✅ Voice conversation completed successfully');
    } catch (error) {
      console.error('❌ [CANARY] Error in voice processing pipeline:', {
        connectionId,
        error: {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
          status: error.response?.status,
        },
        timestamp: new Date().toISOString(),
      });
      const errorMessage = {
        type: 'error',
        data: 'Sorry, I encountered an error processing your request. Please try again.',
        stack: error.stack,
      };
      console.log('📤 [CANARY] Sending error to client:', {
        connectionId,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      ws.send(JSON.stringify(errorMessage));
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (cleanupError) {
        console.error('⚠️ Error cleaning up temp file:', cleanupError);
      }
    }
  } catch (error) {
    console.error('❌ Error in processAudioBuffer:', error);
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
  console.log(`🚀 WebSocket server running on port ${PORT}`);
  console.log(`🎤 WebSocket endpoint: ws://localhost:${PORT}/api/voice-socket`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
});
