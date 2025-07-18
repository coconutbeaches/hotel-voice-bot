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

      writeFileSync(tempFilePath, audioBuffer);
      const fileStats = statSync(tempFilePath);
      logger.info(`Temporary file created: ${tempFilePath} (${fileStats.size} bytes)`);

      const form = new FormData();
      form.append('file', createReadStream(tempFilePath), { filename: 'audio.webm', contentType: 'audio/webm' });
      form.append('model', 'whisper-1');
      form.append('response_format', 'json');
      form.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json() as OpenAITranscriptionResult;
      return result.text;

    } catch (error) {
      logger.error('Transcription error:', (error as Error).message);
      throw error;

    } finally {
      if (existsSync(tempFilePath)) {
        unlinkSync(tempFilePath);
        logger.info(`Temporary file removed: ${tempFilePath}`);
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
        logger.error(`textToSpeech: OpenAI API error ${response.status} ${response.statusText}`);
        logger.error(`textToSpeech: Error details: ${errorText}`);
        throw new Error(`Failed to generate speech: ${errorText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      logger.info(`textToSpeech: Generated ${buffer.length} bytes of audio data`);
      return buffer;
    } catch (error) {
      logger.error('textToSpeech: Error occurred during processing:', (error as Error).message);
      logger.error('textToSpeech: Stack trace:', (error as Error).stack);
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
        logger.error(`generateResponse: OpenAI API error ${completion.status} ${completion.statusText}`);
        logger.error(`generateResponse: Error details: ${errorText}`);
        throw new Error(`Failed to generate response: ${errorText}`);
      }

      const result = await completion.json() as any;
      const message = result.choices[0]?.message?.content?.trim() || "";
      logger.info('generateResponse: Generated message:', message);
      return message;
    } catch (error) {
      logger.error('generateResponse: Error occurred during processing:', (error as Error).message);
      logger.error('generateResponse: Stack trace:', (error as Error).stack);
      return "Sorry, I couldn't generate a response.";
    }
  }
};
