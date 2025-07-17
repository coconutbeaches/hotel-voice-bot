export declare class OpenAIClient {
    generateResponse(prompt: string): Promise<string>;
    transcribeAudio(audioBuffer: Buffer): Promise<string>;
    textToSpeech(text: string, voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'): Promise<Buffer | null>;
}
export declare const openaiClient: OpenAIClient;
