import { createReadStream, readFileSync } from 'fs';
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
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error transcribing audio:', error);
      }
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
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error converting text to speech:', error);
      }
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
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error generating response:', error);
      }
      throw error;
    }
  },
};

// Export for file-based transcription (used by Vercel Functions)
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    logger.info('[DEBUG] Uploading to Whisper:', { filePath });

    // Read the file as a buffer
    const audioBuffer = readFileSync(filePath);

    // Create a file object with proper metadata
    const file = {
      arrayBuffer: async () => audioBuffer,
      stream: () => Readable.from(audioBuffer),
      blob: async () => new Blob([audioBuffer]),
      name: filePath.split('/').pop() || 'audio.webm',
      size: audioBuffer.length,
    } as any;

    logger.info('[DEBUG] File object created:', {
      name: file.name,
      size: file.size,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });

    logger.info('Transcription result:', transcription.text);

    return transcription.text;
  } catch (error: any) {
    logger.error('❌ Whisper API Error:', error);
    logger.error('Error details:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        'Unknown transcription error'
    );
  }
}
