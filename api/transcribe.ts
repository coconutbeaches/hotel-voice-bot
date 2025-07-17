import fs, { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { transcribeAudio } from '../packages/api/src/services/openaiClient.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  try {
    // Get the raw audio blob from request body
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve());
      req.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

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

    // Create temporary file
    const tempFilePath = join(tmpdir(), `voice-${Date.now()}.${extension}`);

    // Write audio buffer to temporary file
    await writeFile(tempFilePath, audioBuffer);

    // Transcribe the audio
    const transcription = await transcribeAudio(tempFilePath);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    // Return transcription
    return res.status(200).json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: 'Error processing audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
