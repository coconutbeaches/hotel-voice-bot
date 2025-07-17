import { logger } from '../utils/logger.js';

// Stub OpenAI client for now
// TODO: Replace with real OpenAI integration
export const openaiClient = {
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    logger.warn('OpenAI transcription stubbed - returning mock transcription');
    return 'This is a mock transcription of the audio message.';
  },

  async textToSpeech(text: string): Promise<Buffer | null> {
    logger.warn('OpenAI TTS stubbed - returning null');
    return null;
  },

  async generateResponse(prompt: string): Promise<string> {
    logger.warn('OpenAI response generation stubbed - returning mock response');
    return 'This is a mock response from the AI.';
  }
};
