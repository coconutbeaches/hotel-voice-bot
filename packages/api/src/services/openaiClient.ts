import { Configuration, OpenAIApi } from 'openai';
import { logger } from '../utils/logger.js';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing from environment variables');
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const openaiClient = {
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Implementation here will call the appropriate transcribe API from OpenAI
      const transcription = 'Transcribed text'; // Placeholder for actual API call
      return transcription;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error transcribing audio:', error);
      }
      throw error;
    }
  },

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      // Implementation here will call the appropriate text to speech API
      const audioBuffer = Buffer.from(''); // Placeholder for actual API call
      return audioBuffer;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error converting text to speech:', error);
      }
      throw error;
    }
  },

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150,
      });
      return response.data.choices[0].text.trim();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error generating response:', error);
      }
      throw error;
    }
  },
};
