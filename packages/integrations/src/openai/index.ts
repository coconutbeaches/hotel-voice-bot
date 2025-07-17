import OpenAI from 'openai';

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
    try {
      const response = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.mp3', { type: 'audio/mp3' }),
        model: 'whisper-1',
      });

      return response.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return 'Sorry, I could not transcribe the audio.';
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
