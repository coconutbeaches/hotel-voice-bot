import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import OpenAI from 'openai';

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
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'voice-websocket-server',
      timestamp: new Date().toISOString()
    }));
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

wss.on('connection', (ws, req) => {
  console.log('🎤 New voice chat connection established');
  
  // Initialize audio buffer for this connection
  const connectionId = Date.now() + Math.random();
  audioBuffers.set(connectionId, []);

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    data: 'Voice chat ready! Start speaking...'
  }));

  ws.on('message', async (data) => {
    try {
      // Handle different message types
      if (data instanceof Buffer) {
        // Audio data received
        console.log('📡 Received audio chunk:', data.length, 'bytes');
        
        // Add to buffer
        const buffer = audioBuffers.get(connectionId) || [];
        buffer.push(data);
        audioBuffers.set(connectionId, buffer);
        
        // Send acknowledgment
        ws.send(JSON.stringify({
          type: 'audio_received',
          data: 'Audio chunk received'
        }));
        
      } else {
        // Text message (JSON)
        const message = JSON.parse(data.toString());
        console.log('📝 Received message:', message);
        
        if (message.type === 'stop') {
          // Process accumulated audio
          await processAudioBuffer(ws, connectionId);
        }
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Error processing your message: ' + error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('🔌 Voice chat connection closed');
    // Clean up audio buffer
    audioBuffers.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    audioBuffers.delete(connectionId);
  });
});

async function processAudioBuffer(ws, connectionId) {
  try {
    const buffer = audioBuffers.get(connectionId);
    if (!buffer || buffer.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        data: 'No audio data received'
      }));
      return;
    }

    console.log('🎵 Processing audio buffer with', buffer.length, 'chunks');

    // Combine all audio chunks
    const combinedBuffer = Buffer.concat(buffer);
    console.log('📦 Combined audio size:', combinedBuffer.length, 'bytes');

    // Clear the buffer
    audioBuffers.set(connectionId, []);

    // Save to temporary file
    const tempFile = join(tmpdir(), `voice-${connectionId}-${Date.now()}.webm`);
    await writeFile(tempFile, combinedBuffer);

    try {
      // Step 1: Transcribe audio using Whisper
      console.log('🎧 Transcribing audio...');
      ws.send(JSON.stringify({
        type: 'status',
        data: 'Transcribing your message...'
      }));

      const transcription = await openai.audio.transcriptions.create({
        file: combinedBuffer,
        model: 'whisper-1',
        response_format: 'json',
      });

      const userMessage = transcription.text;
      console.log('📝 Transcription:', userMessage);

      // Send transcription to client
      ws.send(JSON.stringify({
        type: 'transcript',
        data: userMessage
      }));

      if (!userMessage.trim()) {
        ws.send(JSON.stringify({
          type: 'error',
          data: 'No speech detected. Please try again.'
        }));
        return;
      }

      // Step 2: Generate AI response using GPT-4o
      console.log('🤖 Generating AI response...');
      ws.send(JSON.stringify({
        type: 'status',
        data: 'Generating response...'
      }));

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
            
            Keep responses conversational, warm, and helpful. Use a friendly, welcoming tone that matches the tropical resort atmosphere. If you don't know something specific about the resort, offer to connect them with the front desk.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;
      console.log('🤖 AI Response:', aiResponse);

      // Send AI response to client
      ws.send(JSON.stringify({
        type: 'ai_response',
        data: aiResponse
      }));

      // Step 3: Convert AI response to speech using TTS
      console.log('🔊 Converting to speech...');
      ws.send(JSON.stringify({
        type: 'status',
        data: 'Converting to speech...'
      }));

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
      ws.send(JSON.stringify({
        type: 'audio',
        data: audioBase64
      }));

      console.log('✅ Voice conversation completed successfully');

    } catch (error) {
      console.error('❌ Error in voice processing pipeline:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Sorry, I encountered an error processing your request. Please try again.'
      }));
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
    ws.send(JSON.stringify({
      type: 'error',
      data: 'Failed to process audio: ' + error.message
    }));
  }
}

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
  console.log(`🎤 WebSocket endpoint: ws://localhost:${PORT}/api/voice-socket`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
});
