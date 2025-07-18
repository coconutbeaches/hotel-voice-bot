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
    const tempFilePath = join(tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webm`);
    
    try {
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty or invalid audio buffer');
      }

      logger.info(`[transcribeAudio] Processing ${audioBuffer.length} bytes of audio data`);
      
      // Write buffer to temporary file
      writeFileSync(tempFilePath, audioBuffer);
      const fileStats = statSync(tempFilePath);
      logger.info(`[transcribeAudio] Created temporary file: ${tempFilePath} (${fileStats.size} bytes)`);

      // Create FormData and let form-data handle headers automatically
      const form = new FormData();
      form.append('file', createReadStream(tempFilePath), {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });
      form.append('model', 'whisper-1');
      form.append('response_format', 'json');
      form.append('language', 'en');

      logger.info('[transcribeAudio] Sending request to OpenAI Whisper API...');

      // Use form directly as body, let form-data set headers
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          // Let form-data set the Content-Type header with boundary
          ...form.getHeaders()
        },
        body: form
      });

      logger.info(`[transcribeAudio] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Get full response body for debugging
        const errorBody = await response.text();
        logger.error(`[transcribeAudio] OpenAI API error ${response.status}: ${errorBody}`);
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      // Parse JSON response
      const result = await response.json() as OpenAITranscriptionResult;
      
      if (!result.text) {
        logger.error('[transcribeAudio] No text field in response:', result);
        throw new Error('No transcription text returned from OpenAI');
      }

      logger.info(`[transcribeAudio] Transcription successful: "${result.text}"`);
      return result.text;

    } catch (error) {
      logger.error('[transcribeAudio] Error during processing:', (error as Error).message);
      logger.error('[transcribeAudio] Stack trace:', (error as Error).stack);
      throw error;

    } finally {
      // Clean up temporary file after response is processed
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
          logger.info(`[transcribeAudio] Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
          logger.warn(`[transcribeAudio] Failed to cleanup temporary file: ${(cleanupError as Error).message}`);
        }
      }
    }
  },

  async textToSpeech(text: string): Promise<Buffer> {
    try {
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
        logger.error(`[textToSpeech] OpenAI API error ${response.status}: ${errorText}`);
        throw new Error(`Failed to generate speech: ${errorText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      logger.info(`[textToSpeech] Generated ${buffer.length} bytes of audio data`);
      return buffer;
    } catch (error) {
      logger.error('[textToSpeech] Error occurred during processing:', (error as Error).message);
      logger.error('[textToSpeech] Stack trace:', (error as Error).stack);
      return Buffer.from('');
    }
  },

  async generateResponse(prompt: string): Promise<string> {
    try {
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
        logger.error(`[generateResponse] OpenAI API error ${completion.status}: ${errorText}`);
        throw new Error(`Failed to generate response: ${errorText}`);
      }

      const result = await completion.json() as any;
      const message = result.choices[0]?.message?.content?.trim() || "";
      logger.info('[generateResponse] Generated message:', message);
      return message;
    } catch (error) {
      logger.error('[generateResponse] Error occurred during processing:', (error as Error).message);
      logger.error('[generateResponse] Stack trace:', (error as Error).stack);
      return "Sorry, I couldn't generate a response.";
    }
  }
};
