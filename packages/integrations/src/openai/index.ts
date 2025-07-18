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

      console.log(`[transcribeAudio] Processing ${audioBuffer.length} bytes of audio data`);
      
      // Write buffer to temporary file
      writeFileSync(tempFilePath, audioBuffer);
      const fileStats = statSync(tempFilePath);
      console.log(`[transcribeAudio] Created temporary file: ${tempFilePath} (${fileStats.size} bytes)`);

      // Create FormData and let form-data handle headers automatically
      const form = new FormData();
      form.append('file', createReadStream(tempFilePath), {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });
      form.append('model', 'whisper-1');
      form.append('response_format', 'json');
      form.append('language', 'en');

      console.log('[transcribeAudio] Sending request to OpenAI Whisper API...');

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

      console.log(`[transcribeAudio] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Get full response body for debugging
        const errorBody = await response.text();
        console.error(`[transcribeAudio] OpenAI API error ${response.status}: ${errorBody}`);
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      // Parse JSON response
      const result = await response.json() as { text: string };
      
      if (!result.text) {
        console.error('[transcribeAudio] No text field in response:', result);
        throw new Error('No transcription text returned from OpenAI');
      }

      console.log(`[transcribeAudio] Transcription successful: "${result.text}"`);
      return result.text;

    } catch (error) {
      console.error('[transcribeAudio] Error during processing:', (error as Error).message);
      console.error('[transcribeAudio] Stack trace:', (error as Error).stack);
      throw error;

    } finally {
      // Clean up temporary file after response is processed
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
          console.log(`[transcribeAudio] Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.warn(`[transcribeAudio] Failed to cleanup temporary file: ${(cleanupError as Error).message}`);
        }
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
