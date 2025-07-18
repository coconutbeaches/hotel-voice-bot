import { createReadStream, statSync } from 'fs';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing from environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeAudio(filePath: string) {
  try {
    // Get file stats for logging
    const stats = statSync(filePath);
    console.log('🎧 Preparing file for transcription:', {
      path: filePath,
      size: stats.size,
    });

    // Log MIME type and encoding right before upload
    const { fileTypeFromFile } = await import('file-type');
    const fileType = await fileTypeFromFile(filePath);
    console.log('📄 File details before upload:', {
      detectedMimeType: fileType?.mime || 'unknown',
      detectedExtension: fileType?.ext || 'unknown',
      filePath,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'json',
    });

    console.log('✅ Transcription result:', transcription);
    return transcription;
  } catch (err: any) {
    // Detailed error logging as requested
    console.error('❌ [Whisper ERROR] message:', err.message);

    if (err.response?.status) {
      console.error('❌ [Whisper ERROR] status:', err.response.status);
    }

    if (err.response?.data) {
      console.error('❌ [Whisper ERROR] data:', err.response.data);
    }

    console.error('❌ [Whisper ERROR] filePath:', filePath);

    // Fallback comprehensive error log
    console.error('[Whisper ERROR]', JSON.stringify(err, null, 2));

    throw err;
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS for voice widget
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | null = null;

  try {
    // Get the raw audio blob from request body
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve());
      req.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    console.log(`[transcribe] Received audio: ${audioBuffer.length} bytes`);

    // Get content type to determine file extension
    const contentType = req.headers['content-type'] || 'audio/webm';
    const extension = contentType.includes('webm')
      ? 'webm'
      : contentType.includes('ogg')
        ? 'ogg'
        : contentType.includes('mp3')
          ? 'mp3'
          : contentType.includes('wav')
            ? 'wav'
            : 'webm';

    console.log(
      `[transcribe] Content-Type: ${contentType}, using extension: ${extension}`
    );

    // Create temporary file
    tempFilePath = join(tmpdir(), `voice-${Date.now()}.${extension}`);

    // Write audio buffer to temporary file
    await fs.writeFile(tempFilePath, audioBuffer);

    console.log(`[transcribe] Wrote temp file: ${tempFilePath}`);
    console.log(`[DEBUG] Uploading to Whisper:`, {
      contentType,
      tempFilePath,
      audioSize: audioBuffer.length,
    });

    // Transcribe the audio
    const response = await transcribeAudio(tempFilePath);

    console.log(`[transcribe] Transcription successful: "${response.text}"`);

    // Clean up temp file
    await fs.unlink(tempFilePath);
    tempFilePath = null;

    // Return transcription
    return res.status(200).json({ transcription: response.text });
  } catch (error) {
    console.error('[transcribe] Error:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error(
          '[transcribe] Failed to clean up temp file:',
          unlinkError
        );
      }
    }

    return res.status(500).json({
      error: 'Error processing audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
