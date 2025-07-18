import OpenAI from 'openai';
import { createReadStream, writeFileSync, unlinkSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIClient {
  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content ||
        'Sorry, I could not generate a response.'
      );
    } catch (error) {
      console.error('Error generating OpenAI response:', error);
      return 'Sorry, I encountered an error while processing your request.';
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const tempFilePath = join(tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webm`);
    
    try {
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty or invalid audio buffer');
      }

      writeFileSync(tempFilePath, audioBuffer);
      const fileStats = statSync(tempFilePath);
      console.log(`Temporary file created: ${tempFilePath} (${fileStats.size} bytes)`);

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

      const result = await response.json() as { text: string };
      return result.text;

    } catch (error) {
      console.error('Transcription error:', (error as Error).message);
      throw error;

    } finally {
      if (existsSync(tempFilePath)) {
        unlinkSync(tempFilePath);
        console.log(`Temporary file removed: ${tempFilePath}`);
      }
    }
  }

  async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer | null> {
    try {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Error generating speech:', error);
      return null;
    }
  }
}

export const openaiClient = new OpenAIClient();
