import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

import OpenAI from 'openai';

import { logger } from '../utils/logger.js';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing from environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openaiClient = {
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Create a Blob-like object for the OpenAI API
      const file = {
        arrayBuffer: async () => audioBuffer,
        stream: () => Readable.from(audioBuffer),
        blob: async () => new Blob([audioBuffer]),
        name: 'audio.mp3',
        size: audioBuffer.length,
      } as any;

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
      });

      if (process.env.NODE_ENV === 'development') {
        logger.info('Transcription result:', transcription.text);
      }

      return transcription.text;
    } catch (error) {
      logger.error('Error transcribing audio with full details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      throw error;
    }
  },

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });

      // Convert the response to a buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());

      if (process.env.NODE_ENV === 'development') {
        logger.info('TTS generated audio buffer size:', buffer.length);
      }

      return buffer;
    } catch (error) {
      logger.error('Error converting text to speech with full details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      throw error;
    }
  },

  async generateResponse(prompt: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful hotel concierge assistant. Keep responses brief and friendly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
      });

      const response = completion.choices[0].message.content || '';

      if (process.env.NODE_ENV === 'development') {
        logger.info('Generated response:', response);
      }

      return response.trim();
    } catch (error) {
      logger.error('Error generating response with full details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      throw error;
    }
  },
};

export async function transcribeAudio(filePath: string) {
  try {
    // Get file stats for logging
    const stats = statSync(filePath);
    console.log('🎧 Preparing file for transcription:', {
      path: filePath,
      size: stats.size,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'json',
    });

    console.log('✅ Transcription result:', transcription);
    return transcription;
  } catch (error: any) {
    console.error('❌ OpenAI error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      filePath,
    });
    throw error;
  }
}
