import { createReadStream, writeFileSync, unlinkSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { logger } from '../utils/logger.js';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing from environment variables');
}

interface OpenAITranscriptionResult {
  text: string;
}

export const openaiClient = {
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    // 🎧 Determine file extension based on buffer content
    let fileExtension = 'mp4';
    let mimeType = 'audio/mp4';
    
    // Check for common audio file signatures
    const headerBytes = audioBuffer.slice(0, 12);
    const header = headerBytes.toString('hex');
    
    if (header.startsWith('1a45dfa3')) {
      fileExtension = 'webm';
      mimeType = 'audio/webm';
    } else if (header.includes('667479706d703434') || header.includes('667479706d703432')) {
      fileExtension = 'mp4';
      mimeType = 'audio/mp4';
    } else if (header.startsWith('52494646')) {
      fileExtension = 'wav';
      mimeType = 'audio/wav';
    }
    
    const tempFilePath = join(tmpdir(), `speech_${timestamp}_${randomId}.${fileExtension}`);
    
    try {
      // 🧱 Verify buffer integrity
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty or invalid audio buffer');
      }

      logger.info('[transcribeAudio] Processing audio buffer', {
        size: audioBuffer.length,
        detectedMimeType: mimeType,
        fileExtension: fileExtension,
        tempFilePath: tempFilePath
      });

      // 🧪 Debug: Log first 100 bytes as base64
      const debugBytes = audioBuffer.slice(0, 100).toString('base64');
      logger.debug('[transcribeAudio] First 100 bytes (base64):', debugBytes);

      // 🧪 Debug: Log header information
      const headerHex = audioBuffer.slice(0, 16).toString('hex');
      logger.debug('[transcribeAudio] File header (hex):', headerHex);
      
      // Write buffer to temporary file
      writeFileSync(tempFilePath, audioBuffer);
      const fileStats = statSync(tempFilePath);
      
      // Verify file was written correctly
      if (fileStats.size !== audioBuffer.length) {
        throw new Error(`File size mismatch: buffer=${audioBuffer.length}, file=${fileStats.size}`);
      }
      
      logger.info('[transcribeAudio] Temporary file created successfully', {
        path: tempFilePath,
        size: fileStats.size,
        mimeType: mimeType
      });

      // 🎧 Create FormData with proper audio format
      const form = new FormData();
      form.append('file', createReadStream(tempFilePath), {
        filename: `speech.${fileExtension}`,
        contentType: mimeType
      });
      form.append('model', 'whisper-1');
      form.append('response_format', 'json');
      form.append('language', 'en');

      logger.info('[transcribeAudio] Sending request to OpenAI Whisper API', {
        filename: `speech.${fileExtension}`,
        contentType: mimeType,
        fileSize: fileStats.size
      });

      // 🧪 Debug: Log form headers
      const formHeaders = form.getHeaders();
      logger.debug('[transcribeAudio] Form headers:', formHeaders);

      // Make API request
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formHeaders
        },
        body: form
      });

      logger.info('[transcribeAudio] OpenAI API response', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        // 🛡️ Get full response body for debugging
        const errorBody = await response.text();
        logger.error('[transcribeAudio] OpenAI API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          requestMimeType: mimeType,
          requestFilename: `speech.${fileExtension}`
        });
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      // Parse JSON response
      const result = await response.json() as OpenAITranscriptionResult;
      
      if (!result.text) {
        logger.error('[transcribeAudio] No text field in response:', result);
        throw new Error('No transcription text returned from OpenAI');
      }

      logger.info('[transcribeAudio] Transcription successful', {
        text: result.text,
        textLength: result.text.length
      });
      
      return result.text;

    } catch (error) {
      logger.error('[transcribeAudio] Error during processing', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        bufferSize: audioBuffer.length,
        mimeType: mimeType,
        tempFilePath: tempFilePath
      });
      throw error;

    } finally {
      // Clean up temporary file after response is processed
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
          logger.debug('[transcribeAudio] Cleaned up temporary file:', tempFilePath);
        } catch (cleanupError) {
          logger.warn('[transcribeAudio] Failed to cleanup temporary file', {
            path: tempFilePath,
            error: (cleanupError as Error).message
          });
        }
      }
    }
  },

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      logger.info('[textToSpeech] Generating speech', { textLength: text.length });
      
      const response = await fetch(`https://api.openai.com/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'tts-1',
            voice: 'alloy',
            input: text,
            response_format: 'mp3'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[textToSpeech] OpenAI API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to generate speech: ${errorText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      logger.info('[textToSpeech] Speech generated successfully', {
        audioSize: buffer.length
      });
      
      return buffer;
    } catch (error) {
      logger.error('[textToSpeech] Error occurred during processing', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      return Buffer.from('');
    }
  },

  async generateResponse(prompt: string): Promise<string> {
    try {
      logger.info('[generateResponse] Generating response', { promptLength: prompt.length });
      
      const completion = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful hotel concierge assistant. Keep responses brief and friendly.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150
        })
      });

      if (!completion.ok) {
        const errorText = await completion.text();
        logger.error('[generateResponse] OpenAI API error', {
          status: completion.status,
          statusText: completion.statusText,
          body: errorText
        });
        throw new Error(`Failed to generate response: ${errorText}`);
      }

      const result = await completion.json() as any;
      const message = result.choices[0]?.message?.content?.trim() || "";
      
      logger.info('[generateResponse] Response generated successfully', {
        responseLength: message.length
      });
      
      return message;
    } catch (error) {
      logger.error('[generateResponse] Error occurred during processing', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      return "Sorry, I couldn't generate a response.";
    }
  }
};
